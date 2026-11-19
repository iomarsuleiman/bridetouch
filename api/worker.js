// Image API for melo studio.
// - POST /images  — upload (multipart form, field "file"). Requires a valid
//   Clerk session token (Authorization: Bearer <jwt>), verified against
//   Clerk's public JWKS. No secret key needed.
// - GET  /images/<key> — public image serving from the R2 bucket.

const CLERK_ISSUER = "https://humane-satyr-4557.clerk.accounts.dev";
const ALLOWED_ORIGINS = ["http://localhost:5173"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AGE = 60 * 60 * 24 * 365; // immutable-ish cache for images

const CORS = (origin) => ({
  "Access-Control-Allow-Origin": origin || "null",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});

function response(body, init = {}, origin = null) {
  return new Response(body, {
    ...init,
    headers: { ...CORS(origin), ...(init.headers || {}) },
  });
}

// --- Minimal RS256 JWT verification against Clerk's JWKS ---

let jwksCache = { keys: null, fetchedAt: 0 };

async function getJwks() {
  if (jwksCache.keys && Date.now() - jwksCache.fetchedAt < 3_600_000) {
    return jwksCache.keys;
  }
  const res = await fetch(`${CLERK_ISSUER}/.well-known/jwks.json`);
  const data = await res.json();
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function b64urlToBuffer(s) {
  const pad = 4 - (s.length % 4);
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad === 4 ? 0 : pad);
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function verifyClerkToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let payload;
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBuffer(parts[0])));
    if (header.alg !== "RS256") return null;
    payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
  if (payload.iss !== CLERK_ISSUER) return null;
  if (!payload.exp || payload.exp < Date.now() / 1000) return null;

  const jwk = (await getJwks()).find((k) => k.kid === header.kid) ||
    (await (async () => {
      jwksCache = { keys: null, fetchedAt: 0 };
      return (await getJwks()).find((k) => k.kid === header.kid);
    })());
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBuffer(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  return ok && typeof payload.sub === "string" ? { userId: payload.sub, token } : null;
}

// ALLOWED_ORIGINS entries are exact origins, or patterns with one "*" that
// matches a single DNS label part, e.g. "https://bridetouch-*-wareedio.vercel.app"
// for Vercel preview deployments. A "*" never matches dots or slashes.
function originMatches(pattern, origin) {
  if (!pattern.includes("*")) return pattern === origin;
  const re = new RegExp("^" + pattern.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[a-z0-9-]+") + "$", "i");
  return re.test(origin);
}

// --- Worker ---

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const origins = (env.ALLOWED_ORIGINS || ALLOWED_ORIGINS.join(",")).split(",").map(value => value.trim()).filter(Boolean);
    const allowedOrigin = origin && origins.some(pattern => originMatches(pattern, origin)) ? origin : null;
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return response(null, { status: 204 }, allowedOrigin);
    }

    // Public image serving: /images/<key>
    if (request.method === "GET" && url.pathname.startsWith("/images/")) {
      const key = decodeURIComponent(url.pathname.slice("/images/".length));
      const object = await env.IMAGES.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("Cache-Control", `public, max-age=${MAX_AGE}`);
      return new Response(object.body, { headers });
    }

    // Authenticated upload: POST /images
    if (request.method === "POST" && url.pathname === "/images") {
      if (!allowedOrigin) {
        return response(JSON.stringify({ error: "Origin not allowed" }), { status: 403 }, null);
      }
      const user = await verifyClerkToken(request);
      if (!user) {
        return response(JSON.stringify({ error: "Sign in to upload" }), { status: 401 }, allowedOrigin);
      }

      const deployment = origin?.startsWith("http://localhost:") ? env.DEV_CONVEX_URL : env.CONVEX_URL;
      if (!deployment) return response(JSON.stringify({error:"Upload service is not configured"}),{status:503},allowedOrigin);
      const access = await fetch(`${deployment}/api/query`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${user.token}`},body:JSON.stringify({path:"access:current",args:{},format:"json"})});
      const permission = await access.json();
      if (!access.ok || permission.value !== true) return response(JSON.stringify({error:"Administrator access required"}),{status:403},allowedOrigin);
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return response(JSON.stringify({ error: "Missing file field" }), { status: 400 }, allowedOrigin);
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type)) {
        return response(JSON.stringify({ error: "Choose a JPG, PNG, WebP, GIF or AVIF image" }), { status: 400 }, allowedOrigin);
      }
      if (file.size > MAX_BYTES) {
        return response(JSON.stringify({ error: "File too large (max 10 MB)" }), { status: 413 }, allowedOrigin);
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `${user.userId}/${crypto.randomUUID()}.${ext}`;
      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "image/jpeg" },
      });
      return response(JSON.stringify({ url: `/images/${key}` }), {
        headers: { "Content-Type": "application/json" },
      }, allowedOrigin);
    }

    return new Response("Not found", { status: 404 });
  },
};

import { classify, isAssetPath, renderPage, robotsTxt, sitemapXml } from "./worker-seo.js";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function finish(response, path) {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) result.headers.set(name, value);
  const type = response.headers.get("Content-Type") ?? "";
  if (type.includes("text/html") || path === "/sw.js" || path.endsWith(".webmanifest")) {
    result.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  } else if (path.startsWith("/assets/") && response.ok) {
    // Vite fingerprints everything under /assets, so it never changes.
    result.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  if (type.includes("text/html") && classify(path).noindex) result.headers.set("X-Robots-Tag", "noindex");
  return result;
}

export default {
  async fetch(request, env) {
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    const convexUrl = env.CONVEX_URL;

    if (path === "/robots.txt") {
      return finish(new Response(robotsTxt(url.origin), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } }), path);
    }
    if (path === "/sitemap.xml") {
      if (!convexUrl) return finish(new Response("Sitemap unavailable", { status: 503 }), path);
      try {
        const body = await sitemapXml(url.origin, convexUrl);
        return finish(new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } }), path);
      } catch (error) {
        console.error("Sitemap failed", error);
        return finish(new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } }), path);
      }
    }

    if (isAssetPath(path)) return finish(await env.ASSETS.fetch(request), path);

    // Every app route gets the HTML shell, tailored for this URL.
    const shell = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    if (!shell.ok) return finish(shell, path);
    return finish(await renderPage(request, shell, convexUrl), path);
  },
};

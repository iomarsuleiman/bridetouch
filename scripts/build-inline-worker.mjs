import fs from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const root = path.resolve("dist");
const target = path.resolve(".worker-bundle");
fs.mkdirSync(target, { recursive: true });

function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const files = walk(root).sort().map(file => {
  const route = "/" + path.relative(root, file).split(path.sep).join("/");
  const buf = fs.readFileSync(file);
  return {
    route,
    type: contentTypes[path.extname(file)] || "application/octet-stream",
    packed: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 8 } }).toString("base64"),
  };
});
if (!files.some(file => file.route === "/index.html")) throw new Error("Missing built index.html");
const payload = JSON.stringify(files);
const blockSize = 320000;
const imports = [];
const names = [];
const manifest = [];
for (let i = 0; i < payload.length; i += blockSize) {
  const name = "part" + names.length + ".js";
  const id = "part" + names.length;
  const block = payload.slice(i, i + blockSize);
  fs.writeFileSync(path.join(target, name), "export default " + JSON.stringify(block) + ";\n");
  imports.push('import ' + id + ' from "./' + name + '";');
  names.push(id);
}
fs.copyFileSync(path.resolve("worker-seo.js"), path.join(target, "worker-seo.js"));
const convexUrl = process.env.VITE_CONVEX_URL || "";
const worker = `
import { classify, isAssetPath, renderPage, robotsTxt, sitemapXml } from "./worker-seo.js";
${imports.join("\n")}
const CONVEX_URL = ${JSON.stringify(convexUrl)};
const INDEX_HTML = ${JSON.stringify(fs.readFileSync(path.join(root, "index.html"), "utf8"))};
const entries = JSON.parse(${names.join(" + ")});
const assets = new Map(entries.map(entry => [entry.route, entry]));
export default {
  async fetch(request, env = {}) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const convexUrl = env.CONVEX_URL || CONVEX_URL;
    const security = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Frame-Options": "DENY"
    };
    if (url.pathname === "/robots.txt") {
      return new Response(robotsTxt(url.origin), { headers: { ...security, "Content-Type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/sitemap.xml") {
      try {
        return new Response(await sitemapXml(url.origin, convexUrl), { headers: { ...security, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
      } catch {
        return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
      }
    }
    let item = assets.get(url.pathname);
    if (!item) {
      // An SPA route receives the entry HTML, while absent static files remain 404.
      if (/\\.[a-zA-Z0-9]{1,12}$/.test(url.pathname) || url.pathname.startsWith("/assets/")) {
        return new Response("Not found", { status: 404 });
      }
      item = assets.get("/index.html");
    }
    if (!item) return new Response("Not found", { status: 404 });
    const raw = atob(item.packed);
    const bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
    const headers = new Headers({
      "Content-Type": item.type,
      "Content-Encoding": "br",
      "Vary": "Accept-Encoding",
      "Cache-Control": item.route === "/index.html" || item.route === "/sw.js" || item.route.endsWith(".webmanifest")
        ? "no-cache, no-store, must-revalidate"
        : item.route.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    });
    for (const [name, value] of Object.entries(security)) headers.set(name, value);
    if (item.route === "/index.html") {
      // App routes: tailor title/meta per URL and answer unknown pages with 404.
      headers.delete("Content-Encoding");
      if (classify(url.pathname).noindex) headers.set("X-Robots-Tag", "noindex");
      const shell = new Response(INDEX_HTML, { status: 200, headers });
      const page = await renderPage(request, shell, convexUrl);
      return request.method === "HEAD" ? new Response(null, { status: page.status, headers: page.headers }) : page;
    }
    return new Response(request.method === "HEAD" ? null : bytes, { status: 200, headers, encodeBody: "manual" });
  }
};
`;
fs.writeFileSync(path.join(target, "worker.js"), worker);
const index = { files: files.map(({route,type})=>({route,type})), modules: ["worker.js",...names.map((_,i)=>"part"+i+".js")], fileCount: files.length, payloadBytes:payload.length };
fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify(index, null, 2));
console.log("Built Worker modules", JSON.stringify({ files:index.files.length, modules:index.modules, payloadBytes:index.payloadBytes }));

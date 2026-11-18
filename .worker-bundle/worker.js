
import { classify, isAssetPath, renderPage, robotsTxt, sitemapXml } from "./worker-seo.js";
import part0 from "./part0.js";
import part1 from "./part1.js";
import part2 from "./part2.js";
import part3 from "./part3.js";
import part4 from "./part4.js";
import part5 from "./part5.js";
import part6 from "./part6.js";
const CONVEX_URL = "https://resilient-snake-473.eu-west-1.convex.cloud";
const INDEX_HTML = "<!doctype html>\n<html lang=\"en\" dir=\"ltr\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content\" />\n    <meta name=\"theme-color\" content=\"#faf9f5\" />\n    <title>bridetouch</title>\n    <meta name=\"description\" content=\"Shop bridetouch online. Pay cash on delivery.\" />\n    <meta property=\"og:site_name\" content=\"bridetouch\" />\n    <meta property=\"og:type\" content=\"website\" />\n    <meta property=\"og:title\" content=\"bridetouch\" />\n    <meta property=\"og:description\" content=\"Shop bridetouch online. Pay cash on delivery.\" />\n    <meta property=\"og:image\" content=\"/icon-512.png\" />\n    <meta name=\"twitter:card\" content=\"summary\" />\n    <meta name=\"format-detection\" content=\"telephone=no\" />\n    <link rel=\"manifest\" href=\"/manifest.webmanifest\" />\n    <link rel=\"apple-touch-icon\" href=\"/icon-192.png\" />\n    <link rel=\"icon\" type=\"image/png\" href=\"/bridetouch-logo.png\" />\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n    <link\n      rel=\"stylesheet\"\n      href=\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400,50,1;9..144,500,50,1;9..144,600,50,1&family=JetBrains+Mono:wght@400;700&display=swap\"\n    />\n    <style>html,body{background:#faf9f5;margin:0}#boot{place-items:center;min-height:100vh;display:grid}#boot span{border:2px solid #e3e0d6;border-top-color:#355241;border-radius:50%;width:30px;height:30px;animation:.8s linear infinite boot}@keyframes boot{to{transform:rotate(360deg)}}</style>\n    <script type=\"module\" crossorigin src=\"/assets/index-rrAJhsYF.js\"></script>\n    <link rel=\"stylesheet\" crossorigin href=\"/assets/index-Cr8EwSqc.css\">\n  </head>\n  <body>\n    <div id=\"root\"><div id=\"boot\" aria-label=\"Loading\"><span></span></div></div>\n    <noscript>\n      <p style=\"font:16px system-ui;padding:48px;text-align:center\">This shop needs JavaScript to work. Please enable it in your browser and reload.</p>\n    </noscript>\n  </body>\n</html>\n";
const entries = JSON.parse(part0 + part1 + part2 + part3 + part4 + part5 + part6);
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
      if (/\.[a-zA-Z0-9]{1,12}$/.test(url.pathname) || url.pathname.startsWith("/assets/")) {
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

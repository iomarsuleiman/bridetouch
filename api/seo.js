// Vercel Function: serves the app shell for storefront pages with per-page
// <title>, description, Open Graph and Product data (so Google and WhatsApp/
// Instagram link previews show the real product), real 404s, robots.txt and
// a live sitemap.xml. Shares its logic with the Cloudflare Worker.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { classify, renderHtml, robotsTxt, sitemapXml } from "../worker-seo.js";

let shell;
async function appShell(origin) {
  if (shell) return shell;
  try {
    shell = await readFile(path.join(process.cwd(), "dist", "index.html"), "utf8");
  } catch {
    // Fallback: the static file served by Vercel's CDN.
    const res = await fetch(`${origin}/index.html`);
    if (!res.ok) throw new Error(`index.html ${res.status}`);
    shell = await res.text();
  }
  return shell;
}

export async function GET(request) {
  const incoming = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || incoming.host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  // The rewrite passes the original path as ?path=; other params pass through.
  const params = new URLSearchParams(incoming.search);
  const pathname = "/" + (params.get("path") || "").replace(/^\/+/, "");
  params.delete("path");
  const url = new URL(pathname + (params.toString() ? "?" + params : ""), origin);
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

  if (url.pathname === "/robots.txt") {
    return new Response(robotsTxt(origin), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
  }
  if (url.pathname === "/sitemap.xml") {
    try {
      if (!convexUrl) throw new Error("CONVEX_URL is not set");
      return new Response(await sitemapXml(origin, convexUrl), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=900" } });
    } catch (error) {
      console.error("Sitemap failed", error);
      return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
    }
  }

  const { status, html, noindex } = await renderHtml(url, await appShell(origin), convexUrl);
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    // Browsers always revalidate; Vercel's CDN may reuse it for a minute.
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  };
  if (noindex || classify(url.pathname).noindex) headers["X-Robots-Tag"] = "noindex";
  return new Response(html, { status, headers });
}

export const HEAD = GET;

import { afterEach, expect, test, vi } from "vitest";
// @ts-expect-error plain JS module shared with the Cloudflare Worker
import { classify, renderPage, robotsTxt, sitemapXml } from "../worker-seo.js";

afterEach(() => vi.unstubAllGlobals());

test("routes mirror the storefront router, including 404s", () => {
  expect(classify("/").view).toBe("shop");
  expect(classify("/catalog").view).toBe("catalog");
  expect(classify("/product/12")).toEqual({ view: "product", number: 12 });
  expect(classify("/product/abc").view).toBe("notfound");
  expect(classify("/product/1/extra").view).toBe("notfound");
  expect(classify("/nope").view).toBe("notfound");
  expect(classify("/checkout").noindex).toBe(true);
  expect(classify("/admin/orders").noindex).toBe(true);
});

test("robots.txt hides private pages and points at the sitemap", () => {
  const txt = robotsTxt("https://shop.example");
  expect(txt).toContain("Disallow: /admin");
  expect(txt).toContain("Disallow: /checkout");
  expect(txt).toContain("Sitemap: https://shop.example/sitemap.xml");
});

test("sitemap lists home, catalog, categories and every product", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "success", value: [
    { number: 1, name: "Veil", category: "Bridal & Co", stock: 2, img: "https://img.example/v.jpg" },
    { number: 2, name: "Ring", category: "Bridal & Co", stock: 0 },
  ] })));
  const xml = await sitemapXml("https://shop.example", "https://convex.example");
  expect(xml).toContain("<loc>https://shop.example/product/1</loc>");
  expect(xml).toContain("<loc>https://shop.example/product/2</loc>");
  expect(xml).toContain("category=Bridal%20%26%20Co");
  expect(xml).toContain("<image:loc>https://img.example/v.jpg</image:loc>");
});

test("unknown pages are real 404s even when the backend is down", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
  const shell = () => new Response("<html><head><title>x</title></head></html>", { headers: { "Content-Type": "text/html" } });
  expect((await renderPage(new Request("https://shop.example/missing"), shell(), "https://convex.example")).status).toBe(404);
  expect((await renderPage(new Request("https://shop.example/product/3"), shell(), "https://convex.example")).status).toBe(200);
});

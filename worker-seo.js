// Server-side SEO for the storefront Worker(s).
//
// The shop is a single-page app, so crawlers and link previews (WhatsApp,
// Instagram, Facebook, Google) would otherwise see the same blank title on
// every URL. This module, shared by worker.js and the inline bundle:
//   • serves /robots.txt and a live /sitemap.xml built from the catalog,
//   • rewrites index.html per route with the right <title>, description,
//     canonical URL, Open Graph tags and Product structured data,
//   • answers unknown pages and missing products with a real 404 status.
// If the backend can't be reached, the page is served unchanged (never a 404).

const NOINDEX_VIEWS = new Set(["checkout", "confirmation"]);
const STORE_VIEWS = new Set(["", "shop", "catalog", "checkout", "confirmation"]);

export function isAssetPath(pathname) {
  return pathname.startsWith("/assets/") || /\.[a-zA-Z0-9]{1,12}$/.test(pathname);
}

/** Works out what a storefront path is, mirroring src/hooks/useHashRoute.ts. */
export function classify(pathname) {
  const bits = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (bits[0] === "admin") return { view: "admin", noindex: true };
  if (bits[0] === "product") {
    const number = Number(bits[1]);
    return Number.isSafeInteger(number) && number > 0 && bits.length === 2
      ? { view: "product", number }
      : { view: "notfound", noindex: true };
  }
  if (bits.length > 1 || !STORE_VIEWS.has(bits[0])) return { view: "notfound", noindex: true };
  const view = bits[0] || "shop";
  return { view, noindex: NOINDEX_VIEWS.has(view) };
}

async function convexQuery(convexUrl, path, args = {}) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(`${convexUrl}/__seo-cache/${path}?${new URLSearchParams(Object.entries(args).map(([k, v]) => [k, String(v)]))}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit.json();
  }
  const response = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!response.ok) throw new Error(`Convex ${path} ${response.status}`);
  const body = await response.json();
  if (body.status !== "success") throw new Error(`Convex ${path} failed`);
  if (cache) {
    await cache.put(key, new Response(JSON.stringify(body.value), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    }));
  }
  return body.value;
}

const clip = (text, max = 160) => {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
};
const xml = (text) => String(text).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

export function robotsTxt(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /checkout",
    "Disallow: /confirmation",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function sitemapXml(origin, convexUrl) {
  const products = (await convexQuery(convexUrl, "products:list")) ?? [];
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const urls = [
    { loc: `${origin}/`, priority: "1.0" },
    { loc: `${origin}/catalog`, priority: "0.9" },
    ...categories.map((c) => ({ loc: `${origin}/catalog?category=${encodeURIComponent(c)}`, priority: "0.7" })),
    ...products.map((p) => ({ loc: `${origin}/product/${p.number}`, priority: p.stock > 0 ? "0.8" : "0.4", image: p.img })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url><loc>${xml(u.loc)}</loc><priority>${u.priority}</priority>${u.image && /^https?:/.test(u.image) ? `<image:image><image:loc>${xml(u.image)}</image:loc></image:image>` : ""}</url>`).join("\n")}
</urlset>
`;
}

/** Builds the per-page metadata. Returns null when the backend is unavailable. */
async function pageMeta(url, route, convexUrl) {
  if (route.view === "admin") return { title: "Dashboard · bridetouch", noindex: true, status: 200 };
  if (!convexUrl) return null;
  const settings = (await convexQuery(convexUrl, "settings:get")) ?? {};
  const store = settings.storeName || "bridetouch";
  const absolute = (src) => (src ? new URL(src, url.origin).href : `${url.origin}/icon-512.png`);
  const base = {
    title: store,
    description: clip(settings.heroDescription || `Shop ${store} online. Pay cash on delivery.`),
    image: absolute(settings.heroImage || settings.logoImage),
    canonical: `${url.origin}${url.pathname}`,
    noindex: !!route.noindex,
    status: 200,
    type: "website",
    store,
  };
  if (route.view === "notfound") return { ...base, title: `Page not found · ${store}`, status: 404 };
  if (route.view === "checkout") return { ...base, title: `Checkout · ${store}` };
  if (route.view === "confirmation") return { ...base, title: `Order confirmed · ${store}` };
  if (route.view === "catalog") {
    const category = url.searchParams.get("category");
    return {
      ...base,
      title: `${category || "Shop all"} · ${store}`,
      description: clip(category ? `Shop ${category} at ${store}. ${settings.catalogDescription ?? ""}` : settings.catalogDescription || base.description),
      canonical: `${url.origin}/catalog${category ? `?category=${encodeURIComponent(category)}` : ""}`,
    };
  }
  if (route.view === "product") {
    const product = await convexQuery(convexUrl, "products:getByNumber", { number: route.number });
    if (!product) return { ...base, title: `Product not found · ${store}`, status: 404, noindex: true };
    const image = absolute(product.img);
    return {
      ...base,
      title: `${product.name} · ${store}`,
      description: clip(product.description || `${product.name} — ${product.category} at ${store}.`),
      image,
      type: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || undefined,
        image: [image],
        sku: "BT-" + String(product.number).padStart(3, "0"),
        category: product.category,
        brand: { "@type": "Brand", name: store },
        offers: {
          "@type": "Offer",
          url: base.canonical,
          priceCurrency: "EGP",
          price: product.price,
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      },
    };
  }
  return { ...base, canonical: `${url.origin}/` };
}

const attr = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Rewrites the SPA shell's <head> for one page. Plain string edits, so it
 *  runs anywhere (Cloudflare Workers, Vercel Functions, Node). */
export function applyMeta(html, meta) {
  const setMeta = (source, selector, value) => {
    if (!value) return source;
    const re = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*(")`, "i");
    return source.replace(re, `$1${attr(value)}$2`);
  };
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${attr(meta.title)}</title>`);
  out = setMeta(out, 'name="description"', meta.description);
  out = setMeta(out, 'property="og:title"', meta.title);
  out = setMeta(out, 'property="og:description"', meta.description);
  out = setMeta(out, 'property="og:image"', meta.image);
  out = setMeta(out, 'property="og:type"', meta.type);
  out = setMeta(out, 'property="og:site_name"', meta.store);
  out = setMeta(out, 'name="twitter:card"', meta.image ? "summary_large_image" : "summary");
  const head = [
    meta.canonical && !meta.noindex ? `<link rel="canonical" href="${attr(meta.canonical)}">` : "",
    meta.noindex ? `<meta name="robots" content="noindex">` : "",
    meta.canonical ? `<meta property="og:url" content="${attr(meta.canonical)}">` : "",
    meta.jsonLd ? `<script type="application/ld+json" id="ld-product">${safeJson(meta.jsonLd)}</script>` : "",
  ].join("");
  return out.replace(/<\/head>/i, head + "</head>");
}

/** Builds the HTML for an app route: tailored tags and the right status.
 *  Never fails: without backend data the shell is served unchanged. */
export async function renderHtml(url, html, convexUrl) {
  const route = classify(url.pathname);
  let meta = null;
  try {
    meta = await pageMeta(url, route, convexUrl);
  } catch (error) {
    console.error("SEO metadata unavailable", error);
  }
  const status = meta?.status ?? (route.view === "notfound" ? 404 : 200);
  return { status, html: meta ? applyMeta(html, meta) : html, noindex: !!(meta?.noindex ?? route.noindex) };
}

/** Cloudflare helper: given the SPA's index.html response, returns it
 *  rewritten for this request's URL. */
export async function renderPage(request, indexResponse, convexUrl) {
  const { status, html } = await renderHtml(new URL(request.url), await indexResponse.text(), convexUrl);
  const headers = new Headers(indexResponse.headers);
  headers.delete("Content-Length");
  headers.delete("Content-Encoding");
  return new Response(html, { status, headers });
}

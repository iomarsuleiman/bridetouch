import { useEffect } from "react";

export type Seo = {
  title?: string;
  description?: string;
  image?: string;
  /** Path for the canonical URL, e.g. "/product/3". Defaults to the current path. */
  path?: string;
  type?: "website" | "product";
  noindex?: boolean;
};

function setMeta(attr: "name" | "property", key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function clip(text: string | undefined, max = 160) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

/** Keeps <title>, description, canonical and Open Graph/Twitter tags in sync
 *  with the page being shown. The Worker injects the same tags server-side for
 *  crawlers that don't run JavaScript. */
export function useSeo(seo: Seo, storeName = "bridetouch") {
  const { title, description, image, path, type = "website", noindex } = seo;
  useEffect(() => {
    const fullTitle = title ? `${title} · ${storeName}` : storeName;
    document.title = fullTitle;
    const url = location.origin + (path ?? location.pathname);
    const absoluteImage = image ? new URL(image, location.origin).href : location.origin + "/icon-512.png";
    const desc = clip(description);
    setMeta("name", "description", desc);
    setMeta("name", "robots", noindex ? "noindex" : undefined);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", type === "product" ? "product" : "website");
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", absoluteImage);
    setMeta("property", "og:site_name", storeName);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", absoluteImage);
    setCanonical(url);
  }, [title, description, image, path, type, noindex, storeName]);
}

/** Injects a JSON-LD block (Product, Organization…) for rich search results. */
export function useJsonLd(id: string, data: object | null) {
  const json = data ? JSON.stringify(data) : "";
  useEffect(() => {
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!json) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = json;
    return () => el?.remove();
  }, [id, json]);
}

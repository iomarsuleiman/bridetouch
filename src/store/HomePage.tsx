import type { ReactNode } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
import { linkHandler } from "../hooks/useHashRoute";
import { useJsonLd, useSeo } from "../lib/seo";
import { useStoreUI } from "./ui";
import { ProductCard } from "./ProductCard";

export function HomePage({ products, settings, collections }: { products: Doc<"products">[]; settings: Doc<"settings">; collections: Doc<"collections">[] }) {
  const { goToCategory } = useStoreUI();
  const storeName = settings.storeName || "bridetouch";
  const heroDescription = settings.heroDescription ?? "Ceramics, little keepsakes and everyday favorites. Each piece has its own kind of charm.";

  useSeo({ description: heroDescription, image: settings.heroImage || products[0]?.img, path: "/" }, storeName);
  const socials = (settings.socials ?? []).filter((s) => s.enabled && s.url.trim()).map((s) => s.url);
  useJsonLd("ld-store", {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storeName,
    url: location.origin,
    logo: new URL(settings.logoImage || "/bridetouch-logo.png", location.origin).href,
    email: settings.email || undefined,
    address: settings.city ? { "@type": "PostalAddress", addressLocality: settings.city, addressCountry: "EG" } : undefined,
    currenciesAccepted: "EGP",
    paymentAccepted: "Cash",
    sameAs: socials.length ? socials : undefined,
  });

  // In-stock pieces lead; sold-out ones still show, but last.
  const ordered = [...products].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  const heroImg = settings.heroImage || ordered[0]?.img || "";
  const storyImg = settings.storyImage || ordered[4]?.img || "";

  // Never advertise empty placeholder collections as if they contain products.
  // Real product categories appear as browseable groups even before a collection is curated.
  const savedCollections = collections.map((collection) => {
    const members = products.filter((product) => collection.productNumbers?.includes(product.number)
      || (!collection.productNumbers?.length && product.category === collection.name));
    return { name: collection.name, image: collection.image || members[0]?.img || "", count: members.length };
  }).filter((collection) => collection.count > 0);
  const uncoveredCategories = [...new Set(products.map((product) => product.category))]
    .filter((name) => !savedCollections.some((collection) => collection.name.toLowerCase() === name.toLowerCase()))
    .map((name) => {
      const members = products.filter((product) => product.category === name);
      return { name, image: members[0]?.img || "", count: members.length };
    });
  const browseGroups = [...savedCollections, ...uncoveredCategories];

  const grid = (items: Doc<"products">[], eager = false): ReactNode => (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard key={p._id} product={p} eager={eager} />
      ))}
    </div>
  );
  const featured = ordered.slice(0, 4);
  const more = ordered.slice(4, 8);

  return (
    <>
      <section className={"hero" + (!heroImg ? " hero-no-image" : "")}>
        <div className="hero-copy">
          <h1 className="hero-title">
            {settings.heroTitle ?? <>A little something, <em>made by hand.</em></>}
          </h1>
          <p className="hero-sub">{heroDescription}</p>
          <a className="btn primary hero-cta" href="/catalog" onClick={linkHandler("catalog", () => goToCategory("All"))}>
            Explore the collection <Icon name="arrow" />
          </a>
        </div>
        {heroImg ? (
          <div className="hero-art">
            <SmartImage className="hero-img" src={heroImg} alt={`${storeName} featured piece`} fetchPriority="high" />
          </div>
        ) : null}
      </section>
      {browseGroups.length ? (
        <section className="shop-section storefront-collections" aria-labelledby="collections-heading">
          <div className="section-heading reveal"><h2 id="collections-heading">Explore our collections.</h2></div>
          <div className="card-list">
            {browseGroups.map((collection) => {
              const href = "/catalog?category=" + encodeURIComponent(collection.name);
              return (
                <a className="collection-card reveal" key={collection.name} href={href} onClick={linkHandler(href, () => goToCategory(collection.name))}>
                  <SmartImage src={collection.image} alt="" loading="lazy" />
                  <span className="cc-body">
                    <strong>{collection.name}</strong>
                    <small>{collection.count} {collection.count === 1 ? "piece" : "pieces"}</small>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}
      <section className="shop-section" aria-labelledby="featured-heading">
        <div className="section-heading reveal">
          <h2 id="featured-heading">Made to make you smile.</h2>
          {products.length ? (
            <a className="btn secondary" href="/catalog" onClick={linkHandler("catalog", () => goToCategory("All"))}>
              View all <Icon name="arrow" size="sm" />
            </a>
          ) : null}
        </div>
        {featured.length ? grid(featured, true) : (
          <div className="empty">
            <Icon name="sparkle" size="xl" />
            <h3>New pieces are on their way.</h3>
            <p>Follow us for the first look when they arrive.</p>
          </div>
        )}
      </section>
      <div className={"story-band reveal" + (!storyImg ? " story-no-image" : "")}>
        <div className="story-copy">
          <h2>{settings.storyTitle ?? "Good things take a little time."}</h2>
          <p>{settings.storyDescription ?? "Thoughtfully made pieces for the quiet, colorful moments in everyday life."}</p>
          <a className="btn secondary" href="/catalog" onClick={linkHandler("catalog", () => goToCategory("All"))}>
            Shop now <Icon name="arrow" size="sm" />
          </a>
        </div>
        {storyImg ? <SmartImage className="story-photo" src={storyImg} alt="" loading="lazy" /> : null}
      </div>
      {more.length ? (
        <section className="shop-section" style={{ paddingTop: 8 }} aria-labelledby="more-heading">
          <div className="section-heading reveal">
            <h2 id="more-heading">Little lovely things.</h2>
          </div>
          {grid(more)}
        </section>
      ) : null}
    </>
  );
}

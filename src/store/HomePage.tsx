import type { ReactNode } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { ProductCard } from "./ProductCard";

// Port of home() from src/index.html.
export function HomePage({ products, settings, collections }: { products: Doc<"products">[]; settings: Doc<"settings">; collections: Doc<"collections">[] }) {
  const { goToCategory } = useStoreUI();

  const heroImg = settings.heroImage || products[0]?.img || "";
  const storyImg = settings.storyImage || products[4]?.img || "";

  const grid = (items: Doc<"products">[]): ReactNode => items.length ? (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  ) : <div className="empty">New pieces are coming soon. Follow us for updates.</div>;

  return (
    <>
      <section className={"hero" + (!heroImg ? " hero-no-image" : "")}>
        <div className="hero-copy">
          <h1>
            {settings.heroTitle ?? <>A little something, <em>made by hand.</em></>}
          </h1>
          <p>{settings.heroDescription ?? "Ceramics, little keepsakes and everyday favorites. Each piece has its own kind of charm."}</p>
          <button className="btn primary" onClick={() => goToCategory("All")}>
            Explore the collection <Icon name="arrow" />
          </button>
        </div>
        {heroImg ? <div className="hero-art">
          <img className="hero-img" src={heroImg} alt="Handmade ceramic piece" />
        </div> : null}
      </section>
      {collections.length ? <section className="shop-section storefront-collections"><div className="section-heading"><h2>Explore our collections.</h2></div><div className="card-list">{collections.map(c => <button className="collection-card" key={c._id} onClick={() => goToCategory(c.name)}>{c.image ? <img src={c.image} alt={c.name} loading="lazy" /> : null}<span className="cc-body"><strong>{c.name}</strong><small>{products.filter(p => c.productNumbers?.includes(p.number)).length} pieces</small></span></button>)}</div></section> : null}
      <section className="shop-section">
        <div className="section-heading">
          <div>
            <h2>Made to make you smile.</h2>
          </div>
          <button className="btn secondary" onClick={() => goToCategory("All")}>
            View all <Icon name="arrow" size="sm" />
          </button>
        </div>
        {grid(products.slice(0, 4))}
      </section>
      <div className={"story-band" + (!storyImg ? " story-no-image" : "")}>
        <div className="story-copy">
          <h2>{settings.storyTitle ?? "Good things take a little time."}</h2>
          <p>{settings.storyDescription ?? "Thoughtfully made pieces for the quiet, colorful moments in everyday life."}</p>
          <button className="btn secondary" onClick={() => goToCategory("All")}>
            Shop handmade <Icon name="arrow" size="sm" />
          </button>
        </div>
        {storyImg ? <img className="story-photo" src={storyImg} alt="Handcrafted ceramics" loading="lazy" /> : null}
      </div>
      <section className="shop-section" style={{ paddingTop: 8 }}>
        <div className="section-heading">
          <div>
            <h2>Little lovely things.</h2>
          </div>
        </div>
        {grid(products.slice(4, 8))}
      </section>
    </>
  );
}

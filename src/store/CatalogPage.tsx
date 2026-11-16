import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { ProductCard } from "./ProductCard";

// Port of catalog() from src/index.html.
export function CatalogPage({
  products,
  category,
  collections,
  settings,
}: {
  products: Doc<"products">[];
  category: string;
  collections: Doc<"collections">[];
  settings: Doc<"settings">;
}) {
  const { goToCategory } = useStoreUI();
  const [query, setQuery] = useState("");

  const cats = ["All", ...new Set([...products.map(p => p.category), ...collections.map(c => c.name)])];
  const collection = collections.find(c => c.name === category);
  const search = query.trim().toLowerCase();

  const items = products
    .filter((p) => category === "All" || (collection ? collection.productNumbers?.includes(p.number) : p.category === category))
    .filter((p) => !search || [p.name, p.category, p.description ?? ""].some(value => value.toLowerCase().includes(search)));

  return (
    <>
      <div className="store-top">
        <h1>{category === "All" ? settings.catalogTitle ?? "Handmade, for you." : category}</h1>
        <p>{settings.catalogDescription ?? "Every piece is a little different. That is the lovely part."}</p>
      </div>
      <section className="shop-section" style={{ paddingTop: 20 }}>
        <div className="catalog-tools">
          <div className="category-chips">
            {cats.map((c) => (
              <button
                key={c}
                className={"chip" + (category === c ? " on" : "")}
                onClick={() => {
                  setQuery("");
                  goToCategory(c);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="search">
            <Icon name="search" size="sm" />
            <input
              id="catalog-search"
              type="search"
              aria-label="Search products"
              placeholder="Find something lovely…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="product-grid">
          {items.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
        {items.length ? null : <div className="empty">No pieces match that search.</div>}
      </section>
    </>
  );
}

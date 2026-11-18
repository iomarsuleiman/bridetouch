import { useMemo, useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Icon } from "../components/Icon";
import { clip, useSeo } from "../lib/seo";
import { useStoreUI } from "./ui";
import { ProductCard } from "./ProductCard";

type Sort = "featured" | "newest" | "price-asc" | "price-desc";

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
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const [sort, setSort] = useState<Sort>("featured");

  const title = category === "All" ? settings.catalogTitle ?? "Handmade, for you." : category;
  const description = settings.catalogDescription ?? "Every piece is a little different. That is the lovely part.";
  useSeo(
    {
      title: category === "All" ? "Shop all" : category,
      description: category === "All" ? description : clip(`Shop ${category} at ${settings.storeName}. ${description}`),
      path: "/catalog" + (category === "All" ? "" : "?category=" + encodeURIComponent(category)),
    },
    settings.storeName,
  );

  const cats = ["All", ...new Set([...products.map((p) => p.category), ...collections.map((c) => c.name)])];
  const collection = collections.find((c) => c.name === category);
  const search = query.trim().toLowerCase();

  const items = useMemo(() => {
    const filtered = products
      .filter((p) => category === "All" || (collection
        ? (collection.productNumbers?.includes(p.number) || (!collection.productNumbers?.length && p.category === category))
        : p.category === category))
      .filter((p) => !search || [p.name, p.category, p.description ?? ""].some((value) => value.toLowerCase().includes(search)));
    const inStockFirst = (a: Doc<"products">, b: Doc<"products">) => Number(b.stock > 0) - Number(a.stock > 0);
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => inStockFirst(a, b) || a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => inStockFirst(a, b) || b.price - a.price);
    else if (sort === "newest") sorted.sort((a, b) => inStockFirst(a, b) || b.number - a.number);
    else sorted.sort(inStockFirst);
    return sorted;
  }, [products, category, collection, search, sort]);

  const updateQuery = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(location.search);
    if (value.trim()) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : ""));
  };

  return (
    <>
      <div className="store-top">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <section className="shop-section catalog-section">
        <div className="catalog-tools">
          <div className="category-chips" aria-label="Categories">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
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
          <div className="catalog-controls">
            <div className="search">
              <Icon name="search" size="sm" />
              <input
                id="catalog-search"
                type="search"
                aria-label="Search products"
                placeholder="Find something lovely…"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                enterKeyHint="search"
              />
            </div>
            <label className="sort-select">
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              <Icon name="chevron" size="sm" />
            </label>
          </div>
        </div>
        <p className="result-count" aria-live="polite">
          {items.length} {items.length === 1 ? "piece" : "pieces"}
          {search ? <> for “{query.trim()}”</> : null}
        </p>
        {items.length ? (
          <div className="product-grid">
            {items.map((p, i) => (
              <ProductCard key={p._id} product={p} eager={i < 4} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="search" size="xl" />
            <h3>{search ? "Nothing matches that search." : "Nothing here yet."}</h3>
            <p>{search ? "Try a different word, or browse everything." : "New pieces are on their way. Browse the rest of the shop for now."}</p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                updateQuery("");
                if (category !== "All") goToCategory("All");
              }}
            >
              {search ? "Clear search" : "Shop all"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}

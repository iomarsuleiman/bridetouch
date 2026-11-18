import type { Doc } from "../../convex/_generated/dataModel";
import { StatusPage } from "../components/ErrorBoundary";
import { Icon } from "../components/Icon";
import { linkHandler } from "../hooks/useHashRoute";
import { useSeo } from "../lib/seo";
import { ProductCard } from "./ProductCard";
import { useStoreUI } from "./ui";

export function NotFoundPage({
  products,
  storeName,
  kind = "page",
}: {
  products: Doc<"products">[];
  storeName?: string;
  kind?: "page" | "product";
}) {
  const { goToCategory } = useStoreUI();
  useSeo({ title: kind === "product" ? "Product not found" : "Page not found", noindex: true }, storeName);
  const suggestions = products.filter((p) => p.stock > 0).slice(0, 4);

  return (
    <>
      <StatusPage
        code="404"
        title={kind === "product" ? "This piece has moved on." : "We couldn't find that page."}
        message={
          kind === "product"
            ? "It may have sold out or been removed from the shop. Have a look at what's new instead."
            : "The link may be broken, or the page may have moved."
        }
        actions={
          <>
            <button type="button" className="btn primary" onClick={() => goToCategory("All")}>
              Browse the shop <Icon name="arrow" size="sm" />
            </button>
            <a className="btn secondary" href="/" onClick={linkHandler("shop")}>
              Go home
            </a>
          </>
        }
      />
      {suggestions.length ? (
        <section className="shop-section related-section">
          <div className="section-heading">
            <h2>You might like these.</h2>
          </div>
          <div className="product-grid">
            {suggestions.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

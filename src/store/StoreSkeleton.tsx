import type { StoreView } from "../hooks/useHashRoute";

/** Shimmering placeholders shown while the catalog loads, shaped like the page
 *  that is about to appear so nothing jumps when it does. */
export function StoreSkeleton({ view }: { view: StoreView }) {
  const tiles = (
    <div className="product-grid">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton-tile">
          <div className="skeleton skeleton-photo" />
          <div className="skeleton skeleton-line" style={{ width: "70%" }} />
          <div className="skeleton skeleton-line" style={{ width: "40%" }} />
        </div>
      ))}
    </div>
  );
  return (
    <div className="store-skeleton" role="status" aria-label="Loading">
      {view === "product" ? (
        <div className="product-detail">
          <div className="skeleton skeleton-detail-image" />
          <div className="detail-info">
            <div className="skeleton skeleton-line" style={{ height: 44, width: "80%" }} />
            <div className="skeleton skeleton-line" style={{ height: 22, width: "30%", marginTop: 24 }} />
            <div className="skeleton skeleton-line" style={{ marginTop: 24 }} />
            <div className="skeleton skeleton-line" style={{ width: "85%" }} />
            <div className="skeleton skeleton-line" style={{ height: 50, marginTop: 40 }} />
          </div>
        </div>
      ) : (
        <>
          {view === "shop" ? <div className="skeleton skeleton-hero" /> : (
            <div className="store-top">
              <div className="skeleton skeleton-line" style={{ height: 48, width: 320, maxWidth: "80%" }} />
            </div>
          )}
          <section className="shop-section">{tiles}</section>
        </>
      )}
    </div>
  );
}

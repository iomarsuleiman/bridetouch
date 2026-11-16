import { Icon } from "../components/Icon";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

// Port of the vanilla collectionsPage().
export function CollectionsPage({ ctx }: { ctx: AdminCtx }) {
  return (
    <>
      <Heading
        title="Collections"
        subtitle="Curate how your products are discovered."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-collection")}>
            <Icon name="plus" size="sm" /> Create collection
          </button>
        }
      />
      {!ctx.collections.length ? <div className="empty">Create a collection and select products to feature.</div> : null}
      <div className="card-list">
        {ctx.collections.map((c) => (
          <article key={c._id} className="collection-card">
            <img src={c.image} alt={c.name} loading="lazy" />
            <div className="cc-body">
              <span>
                <strong>{c.name}</strong>
                <small>{ctx.products.filter(p => c.productNumbers?.includes(p.number)).length} products</small>
              </span>
              <button className="btn icon-only ghost" onClick={() => ctx.openEditCollection(c._id)} aria-label={"Edit " + c.name}>
                <Icon name="edit" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

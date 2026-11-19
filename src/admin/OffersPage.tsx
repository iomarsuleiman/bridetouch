import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { DeleteButton, Heading } from "./shared";
import { friendlyError } from "../lib/format";
import type { AdminCtx } from "./types";

// Port of the vanilla offersPage().
export function OffersPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const toggle = useMutation(api.offers.toggle);
  const remove = useMutation(api.offers.remove);

  return (
    <>
      <Heading
        title="Banners"
        subtitle="Promotional messages in the banner at the top of your store. To actually discount prices, use Sales or Discount codes."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-offer")}>
            <Icon name="plus" size="sm" /> New banner
          </button>
        }
      />
      {!ctx.offers.length ? <div className="empty">No banners yet. An active banner shows across the top of your store, e.g. “Free gift wrapping this week”.</div> : null}
      <div className="card-list">
        {ctx.offers.map((o) => (
          <article key={o._id} className="offer-card">
            <div>
              <Badge text={o.active ? "Active" : "Paused"} />
              <h3>{o.name}</h3>
              <p>
                {o.kind} · {o.details}
              </p>
            </div>
            <div className="bottom">
              <button className="text-button" onClick={() => ctx.openEditOffer(o._id)}>
                Edit campaign <Icon name="arrow" size="sm" />
              </button>
              <button
                className="btn small secondary"
                onClick={async () => { try { await toggle({id:o._id}); toast(o.active ? "Offer paused" : "Offer activated"); } catch (e) { toast(friendlyError(e, "Could not update offer")); } }}
              >
                {o.active ? "Pause" : "Activate"}
              </button>
              <DeleteButton label="" onDelete={async () => { try { await remove({ id: o._id }); toast("Offer deleted"); } catch (e) { toast(friendlyError(e, "Could not delete offer")); } }} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

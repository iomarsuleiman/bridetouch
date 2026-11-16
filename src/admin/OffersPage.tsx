import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

// Port of the vanilla offersPage().
export function OffersPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const toggle = useMutation(api.offers.toggle);

  return (
    <>
      <Heading
        title="Offers & campaigns"
        subtitle="Create a reason to come back."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-offer")}>
            <Icon name="plus" size="sm" /> New offer
          </button>
        }
      />
      {!ctx.offers.length ? <div className="empty">No campaigns yet.</div> : null}
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
                onClick={async () => { try { await toggle({id:o._id}); toast("Offer updated"); } catch { toast("Could not update offer"); } }}
              >
                {o.active ? "Pause" : "Activate"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

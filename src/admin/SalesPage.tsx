import { friendlyError } from "../lib/format";
import { DeleteButton } from "./shared";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

function fmt(ms: number) {
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Timed, automatic-percentage sales. The best active one applies at checkout
// and is promoted in the storefront banner.
export function SalesPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const toggle = useMutation(api.sales.toggle);
  const remove = useMutation(api.sales.remove);
  const now = Date.now();

  return (
    <>
      <Heading
        title="Sales"
        subtitle="Timed discounts that apply themselves at checkout."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-sale")}>
            <Icon name="plus" size="sm" /> New sale
          </button>
        }
      />
      <div className="card-list">
        {[...ctx.sales].sort((a, b) => b.endsAt - a.endsAt).map((s) => {
          const running = s.active && s.startsAt <= now && now <= s.endsAt;
          const upcoming = s.active && s.startsAt > now;
          return (
            <article key={s._id} className="offer-card">
              <div>
                <Badge text={running ? "Active" : upcoming ? "Scheduled" : s.active ? "Ended" : "Paused"} />
                <h3>{s.name}</h3>
                <p>
                  {s.percentOff}% off {s.scope === "products"
                    ? `· ${s.productNumbers?.length ?? 0} selected product(s)`
                    : s.scope === "collections"
                      ? `· ${s.collectionNames?.join(", ") || "Selected collections"}`
                      : "· All products"} · {fmt(s.startsAt)} → {fmt(s.endsAt)}
                </p>
              </div>
              <div className="bottom">
                <button
                  className="btn small secondary"
                  onClick={async () => { try { await toggle({id:s._id}); toast(s.active ? "Sale paused" : "Sale activated"); } catch (e) { toast(friendlyError(e, "Could not update sale")); } }}
                >
                  {s.active ? "Pause" : "Activate"}
                </button>
                <DeleteButton onDelete={async () => { try { await remove({ id: s._id }); toast("Sale deleted"); } catch (e) { toast(friendlyError(e, "Could not delete sale")); } }} />
              </div>
            </article>
          );
        })}
        {!ctx.sales.length ? <div className="empty">No sales yet. Create one to discount products for a set time.</div> : null}
      </div>
    </>
  );
}

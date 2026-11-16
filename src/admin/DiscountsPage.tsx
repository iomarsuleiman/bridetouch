import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { money } from "../lib/format";
import { Heading } from "./shared";
import { copyText } from "./utils";
import type { AdminCtx } from "./types";

// Port of the vanilla discountPage().
export function DiscountsPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const toggle = useMutation(api.coupons.toggle);
  const active = ctx.coupons.filter((c) => c.active).length;
  const uses = ctx.coupons.reduce((s, c) => s + c.uses, 0);

  return (
    <>
      <Heading
        title="Discounts"
        subtitle="Create codes your customers will love."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-discount")}>
            <Icon name="plus" size="sm" /> Create discount
          </button>
        }
      />
      <div className="metric-strip">
        <div className="metric-mini">
          <span>Active discounts</span>
          <strong>{active}</strong>
        </div>
        <div className="metric-mini">
          <span>Redemptions</span>
          <strong>{uses}</strong>
        </div>
        <div className="metric-mini">
          <span>Total codes</span>
          <strong>{ctx.coupons.length}</strong>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Discount codes</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ctx.coupons.map((c) => (
                <tr key={c._id}>
                  <td>
                    <span className="coupon-code">{c.code}</span>
                  </td>
                  <td>{c.type === "Percentage" ? c.value + "% off" : money(c.value) + " off"}</td>
                  <td>{c.uses}</td>
                  <td>
                    <Badge text={c.active ? "Active" : "Paused"} />
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={async () => { try { await toggle({id:c._id}); toast("Discount updated"); } catch { toast("Could not update discount"); } }}
                      aria-label={"Toggle " + c.code}
                    >
                      <Icon name="refresh" />
                    </button>
                    <button
                      className="row-action"
                      onClick={() => copyText(c.code, toast)}
                      aria-label={"Copy coupon " + c.code}
                    >
                      <Icon name="copy" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards">
          {ctx.coupons.map((c) => (
            <div key={c._id} className="mobile-data">
              <span>
                <strong className="coupon-code">{c.code}</strong>
                <small>{c.type === "Percentage" ? c.value + "% off" : money(c.value) + " off"}</small>
              </span>
              <Badge text={c.active ? "Active" : "Paused"} />
              <button
                className="btn small secondary"
                onClick={async () => { try { await toggle({id:c._id}); toast("Discount updated"); } catch { toast("Could not update discount"); } }}
              >
                Toggle
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

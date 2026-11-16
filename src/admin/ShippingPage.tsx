import { Icon } from "../components/Icon";
import { Badge } from "../components/Badge";
import { money } from "../lib/format";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

// Port of the vanilla shippingPage().
export function ShippingPage({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  return (
    <>
      <Heading
        title="Shipping & delivery"
        subtitle="Set delivery fees and fulfillment rules."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("edit-shipping")}>
            <Icon name="edit" size="sm" /> Edit rates
          </button>
        }
      />
      <div className="settings-grid">
        <section className="settings-card">
          <h2>Delivery rates</h2>
          <p>Delivery fees apply at checkout.</p>
          <div className="detail-row">
            <span>Egypt · Standard delivery</span>
            <strong>{money(s.shipping)}</strong>
          </div>
          <div className="detail-row">
            <span>Free delivery threshold</span>
            <strong>{s.freeShipping ? `EGP ${s.freeShippingMin ?? 800}` : "Disabled"}</strong>
          </div>
          <div className="detail-row">
            <span>Payment on delivery</span>
            <Badge text="Active" />
          </div>
        </section>
        <section className="settings-card">
          <h2>Fulfillment</h2>
          <p>Track the order separately from its COD payment.</p>
          <div className="detail-row">
            <span>Processing</span>
            <strong>Manual</strong>
          </div>
          <div className="detail-row">
            <span>Courier</span>
            <strong>Not connected</strong>
          </div>
          <div className="detail-row">
            <span>Tracking</span>
            <strong>Manual updates</strong>
          </div>
        </section>
      </div>
    </>
  );
}

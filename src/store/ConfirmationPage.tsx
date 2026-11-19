import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { linkHandler } from "../hooks/useHashRoute";
import { ReceiptPrinter } from "./ReceiptPrinter";
import { useSeo } from "../lib/seo";

// Order confirmation, staged as a printed receipt.
export function ConfirmationPage({
  order,
  settings,
}: {
  order: Doc<"orders">;
  settings: Doc<"settings">;
}) {
  const products = useQuery(api.products.list);
  const { goToCategory } = useStoreUI();
  useSeo({ title: `Order #BT-${order.number} confirmed`, noindex: true }, settings.storeName);

  if (!products) {
    return (
      <div className="confirmation">
        <div className="page-spinner" role="status"><span className="spinner" aria-hidden="true" /> Preparing your receipt…</div>
      </div>
    );
  }

  return (
    <ReceiptPrinter order={order} settings={settings} products={products}>
      <div className="confirm-actions">
        <a className="btn secondary" href={`/track?order=${order.number}`} onClick={(e) => {
          // Pre-fill the tracking form with this order.
          try { sessionStorage.setItem("bridetouch-track", JSON.stringify({ number: String(order.number), phone: order.phone })); } catch { /* ignore */ }
          linkHandler(`track?order=${order.number}`)(e);
        }}>
          <Icon name="truck" size="sm" /> Track this order
        </a>
        <button className="btn primary" onClick={() => goToCategory("All")}>
          Keep shopping <Icon name="arrow" size="sm" />
        </button>
      </div>
    </ReceiptPrinter>
  );
}

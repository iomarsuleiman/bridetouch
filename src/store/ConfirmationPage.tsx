import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
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
      <button className="btn primary" onClick={() => goToCategory("All")}>
        Keep shopping <Icon name="arrow" size="sm" />
      </button>
    </ReceiptPrinter>
  );
}

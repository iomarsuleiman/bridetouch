import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { ReceiptPrinter } from "./ReceiptPrinter";

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

  if (!products) {
    return (
      <div className="confirmation">
        <div className="empty">Printing…</div>
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

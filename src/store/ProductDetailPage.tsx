import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";
import { useCart } from "../lib/cart";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";

// Port of detail() from src/index.html.
export function ProductDetailPage({ product: p }: { product: Doc<"products"> }) {
  const cart = useCart();
  const toast = useToast();
  const { goToCategory } = useStoreUI();
  const [quantity, setQuantity] = useState(1);

  const maxQty = Math.max(1, p.stock);

  const addToBag = () => {
    const current = cart.items.find((i) => i.number === p.number)?.qty ?? 0;
    if (current + quantity > p.stock) {
      toast(`Only ${p.stock} available`);
      return;
    }
    cart.add({ number: p.number, qty: quantity, color: p.color });
    toast("Added to bag");
  };

  return (
    <div className="product-detail">
      <div>
        <p className="mini-breadcrumb">
          <button onClick={() => goToCategory("All")}>Shop all</button> / {p.category}
        </p>
        <img className="detail-image" src={p.img ?? ""} alt={p.name} />
      </div>
      <div className="detail-info">
        <h1>{p.name}</h1>
        <div className="price">{money(p.price)}</div>
        <p className="desc">{p.description}</p>
        <div className="detail-choice">
          <p>COLOR / FINISH</p>
          <button className="chip on">{p.color || "Original"}</button>
        </div>
        <div className="detail-choice" style={{ marginTop: 0 }}>
          <p>QUANTITY</p>
          <div className="qty-row">
            <div className="qty-step">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                <Icon name="minus" size="sm" />
              </button>
              <strong>{quantity}</strong>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, Math.max(1, q + 1)))}
                aria-label="Increase quantity"
              >
                <Icon name="plus" size="sm" />
              </button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              {p.stock > 0 ? `${p.stock} in stock` : "Sold out"}
            </span>
          </div>
        </div>
        <button
          className="btn primary"
          style={{ width: "100%", padding: 16 }}
          onClick={addToBag}
          disabled={p.stock <= 0}
        >
          Add to bag · {money(p.price * quantity)} <Icon name="bag" size="sm" />
        </button>
      </div>
    </div>
  );
}

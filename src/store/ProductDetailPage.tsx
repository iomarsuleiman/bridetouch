import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";
import { cartItemKey, useCart } from "../lib/cart";
import { availableStock, matchVariant, priceForVariant } from "./productVariants";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { navigate } from "../hooks/useHashRoute";

/** Product options are persisted on the product, not transient UI state. */
export function ProductDetailPage({ product: p }: { product: Doc<"products"> }) {
  const cart = useCart();
  const toast = useToast();
  const { goToCategory } = useStoreUI();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<string[]>(() =>
    p.variants?.find((variant) => variant.stock > 0)?.values ??
    p.options?.map((option) => option.values[0]) ?? [],
  );
  const hasOptions = !!p.options?.length;
  const chosen = hasOptions ? selected : undefined;
  const selectedVariant = hasOptions ? matchVariant(p, chosen) : undefined;
  const stock = availableStock(p, chosen);
  const unitPrice = priceForVariant(p, chosen);
  const maxQty = Math.max(1, stock);
  const valid = !hasOptions || !!selectedVariant;

  function setChoice(index: number, value: string) {
    setSelected((current) => current.map((entry, i) => i === index ? value : entry));
    setQuantity(1);
  }

  function addToBag(buyNow = false) {
    const item = { number: p.number, qty: quantity, variant: chosen };
    const current = cart.items.find((entry) => cartItemKey(entry) === cartItemKey(item))?.qty ?? 0;
    if (!valid || stock <= 0 || (buyNow ? quantity : current + quantity) > stock) {
      toast(stock ? `Only ${stock} available` : "This option is sold out");
      return;
    }
    if (buyNow) {
      cart.clear();
      cart.add(item);
      navigate("checkout");
    } else {
      cart.add(item);
      toast("Added to bag");
    }
  }

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
        <div className="price">{money(unitPrice)}</div>
        <p className="desc">{p.description}</p>
        {hasOptions
          ? p.options!.map((option, index) => (
            <div className="detail-choice" key={option.name}>
              <p>{option.name.toUpperCase()}</p>
              <div className="variant-choices">
                {option.values.map((value) => {
                  const trial = selected.map((entry, i) => i === index ? value : entry);
                  const unavailable = availableStock(p, trial) <= 0;
                  return (
                    <button key={value} type="button" className={"chip" + (selected[index] === value ? " on" : "")}
                      aria-pressed={selected[index] === value}
                      title={unavailable ? "No stock for this combination" : undefined}
                      onClick={() => setChoice(index, value)}>
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
          : p.color ? (
            <div className="detail-choice"><p>COLOR / FINISH</p><span className="chip on">{p.color}</span></div>
          ) : null}
        <div className="detail-choice" style={{ marginTop: 0 }}>
          <p>QUANTITY</p>
          <div className="qty-row">
            <div className="qty-step">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <Icon name="minus" size="sm" />
              </button>
              <strong>{Math.min(quantity, maxQty)}</strong>
              <button type="button" disabled={stock <= 0} onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity">
                <Icon name="plus" size="sm" />
              </button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{stock > 0 ? `${stock} in stock` : "Sold out"}</span>
          </div>
        </div>
        <div className="product-purchase-actions">
          <button className="btn primary" onClick={() => addToBag(false)} disabled={!valid || stock <= 0}>
            Add to bag · {money(unitPrice * Math.min(quantity, maxQty))} <Icon name="bag" size="sm" />
          </button>
          <button className="btn secondary" onClick={() => addToBag(true)} disabled={!valid || stock <= 0}>
            Buy now <Icon name="arrow" size="sm" />
          </button>
        </div>
      </div>
    </div>
  );
}

import type { Doc } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { saleDiscount } from "./salePricing";
import { money } from "../lib/format";
import { useCart } from "../lib/cart";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
import { linkHandler, navigate } from "../hooks/useHashRoute";

export function ProductCard({ product: p, eager = false }: { product: Doc<"products">; eager?: boolean }) {
  const cart = useCart();
  const toast = useToast();
  const sales = useQuery(api.sales.activeList) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const savings = saleDiscount([{ number: p.number, subtotal: p.price }], sales, collections, Date.now());
  const soldOut = p.stock <= 0;
  const lowStock = !soldOut && p.stock <= 3;
  const href = "/product/" + p.number;

  const quickAdd = () => {
    if (p.options?.length) {
      navigate("product/" + p.number);
      return;
    }
    const current = cart.items.find((i) => i.number === p.number)?.qty ?? 0;
    if (current + 1 > p.stock) {
      toast(current ? `You already have all ${p.stock} in your bag` : "Sold out");
      return;
    }
    cart.add({ number: p.number, qty: 1 });
    toast(`${p.name} added to your bag`);
  };

  const tag = soldOut ? "Sold out" : savings ? `${Math.round((savings / p.price) * 100)}% off` : p.tag;

  return (
    <article className={"product-tile reveal" + (soldOut ? " is-sold-out" : "")}>
      <div className="product-photo">
        <a href={href} onClick={linkHandler(href)} className="product-link" aria-label={p.name}>
          <SmartImage src={p.img} alt={p.name} loading={eager ? "eager" : "lazy"} />
        </a>
        {tag ? <span className={"tile-tag" + (soldOut ? " sold" : savings ? " sale" : "")}>{tag}</span> : null}
        {!soldOut ? (
          <button
            type="button"
            className="quick-add"
            aria-label={p.options?.length ? `Choose options for ${p.name}` : `Add ${p.name} to bag`}
            title={p.options?.length ? "Choose options" : "Add to bag"}
            onClick={quickAdd}
          >
            <Icon name={p.options?.length ? "arrow" : "plus"} />
          </button>
        ) : null}
      </div>
      <div className="product-info">
        <div style={{ minWidth: 0 }}>
          <h3>
            <a href={href} onClick={linkHandler(href)}>{p.name}</a>
          </h3>
          <p>{lowStock ? <span className="low-stock">Only {p.stock} left</span> : p.category}</p>
        </div>
        <strong className="product-price">
          {savings ? (
            <>
              <s className="old-price">{money(p.price)}</s> <span className="sale-price">{money(p.price - savings)}</span>
            </>
          ) : (
            money(p.price)
          )}
        </strong>
      </div>
    </article>
  );
}

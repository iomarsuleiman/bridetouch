import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";
import { useCart } from "../lib/cart";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { navigate } from "../hooks/useHashRoute";

// Port of productCard() from src/index.html.
export function ProductCard({ product: p }: { product: Doc<"products"> }) {
  const cart = useCart();
  const toast = useToast();

  const quickAdd = () => {
    if (p.options?.length) {
      navigate("product/" + p.number);
      return;
    }
    const current = cart.items.find((i) => i.number === p.number)?.qty ?? 0;
    if (current + 1 > p.stock) {
      toast(`Only ${p.stock} available`);
      return;
    }
    cart.add({ number: p.number, qty: 1 });
    toast("Added to bag");
  };

  return (
    <article className="product-tile">
      <div className="product-photo" role="group" aria-label={p.name}>
        <img src={p.img ?? ""} alt={p.name} loading="lazy" />
        {p.tag ? <span className="tile-tag">{p.tag}</span> : null}
        <button className="quick-add" aria-label={p.options?.length ? `Choose options for ${p.name}` : `Add ${p.name} to cart`} onClick={quickAdd}>
          <Icon name="plus" />
        </button>
        <button
          style={{ position: "absolute", inset: 0, width: "calc(100% - 52px)", opacity: 0 }}
          aria-label={`View ${p.name}`}
          onClick={() => navigate("product/" + p.number)}
        >
          View
        </button>
      </div>
      <div className="product-info">
        <div style={{ minWidth: 0 }}>
          <h3>{p.name}</h3>
          <p>{p.category}</p>
        </div>
        <strong className="product-price">{money(p.price)}</strong>
      </div>
    </article>
  );
}

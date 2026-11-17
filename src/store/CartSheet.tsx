import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { money } from "../lib/format";
import { cartItemKey, useCart, type CartItem } from "../lib/cart";
import { availableStock, priceForVariant, variantLabel } from "./productVariants";
import { checkoutDiscount } from "./salePricing";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { navigate } from "../hooks/useHashRoute";
import { useStoreUI } from "./ui";
import { shippingTotal } from "./totals";

// Port of cartSheet() from src/index.html.
export function CartSheet({
  products,
  settings,
  couponInput,
  onCouponInputChange,
  appliedCoupon,
  onApplyCoupon,
}: {
  products: Doc<"products">[];
  settings: Doc<"settings">;
  couponInput: string;
  onCouponInputChange: (value: string) => void;
  appliedCoupon: Doc<"coupons"> | null;
  onApplyCoupon: (coupon: Doc<"coupons">) => void;
}) {
  const cart = useCart();
  const sales = useQuery(api.sales.activeList) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const toast = useToast();
  const { closeCart, goToCategory } = useStoreUI();
  const coupon = useQuery(api.coupons.validate, {code: couponInput.trim()});

  const byNumber = (number: number) => products.find((p) => p.number === number);

  const lines = cart.items.flatMap((item) => {
    const product = byNumber(item.number);
    return product ? [{ number: item.number, subtotal: priceForVariant(product, item.variant) * item.qty }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const shipping = shippingTotal(subtotal, settings);
  const discount = checkoutDiscount(lines, appliedCoupon, sales, collections, Date.now());
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = coupon?.code === code ? coupon : null;
    if (found) {
      onApplyCoupon(found);
      toast("Code applied");
    } else {
      toast("Invalid code");
    }
  };

  const changeQty = (product: Doc<"products">, item: CartItem, delta: number) => {
    const next = item.qty + delta;
    if (delta > 0 && next > availableStock(product, item.variant)) {
      toast("Stock limit reached for this option");
      return;
    }
    cart.setQty(product.number, next, item.variant);
  };

  return (
    <>
      <div className="overlay" onClick={closeCart} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="sheet-head">
          <div>
            <h2>Your little bag {cart.count ? `(${cart.count})` : ""}</h2>
          </div>
          <button className="btn icon-only ghost" onClick={closeCart} aria-label="Close bag">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">
          {cart.items.length ? (
            <>
              {cart.items.map((it) => {
                const p = byNumber(it.number);
                if (!p) return null;
                return (
                  <div className="line-item" key={cartItemKey(it)}>
                    <img src={p.img ?? ""} alt="" />
                    <div className="li-info">
                      <strong>{p.name}</strong>
                      <small>{variantLabel(p, it.variant) || p.color}</small>
                      <div className="qty-step" style={{ width: 106, minWidth: 0, height: 36 }}>
                        <button
                          onClick={() => changeQty(p, it, -1)}
                          aria-label={`Decrease ${p.name}`}
                        >
                          <Icon name="minus" size="sm" />
                        </button>
                        {it.qty}
                        <button
                          onClick={() => changeQty(p, it, 1)}
                          aria-label={`Increase ${p.name}`}
                        >
                          <Icon name="plus" size="sm" />
                        </button>
                      </div>
                      <button className="remove" onClick={() => cart.remove(p.number, it.variant)}>
                        Remove
                      </button>
                    </div>
                    <strong style={{ fontSize: 12 }}>{money(priceForVariant(p, it.variant) * it.qty)}</strong>
                  </div>
                );
              })}
              <div style={{ padding: "23px 0" }}>
                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    Discount code
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="couponInput"
                      aria-label="Discount code"
                      placeholder="Enter code"
                      value={couponInput}
                      onChange={(e) => onCouponInputChange(e.target.value)}
                    />
                    <button className="btn secondary" onClick={applyCoupon}>
                      Apply
                    </button>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <div className="empty">
              <Icon name="bag" size="xl" />
              <h3>Your bag feels a little empty.</h3>
              <p>Find something you love.</p>
              <button className="btn primary" onClick={() => goToCategory("All")}>
                Explore the shop
              </button>
            </div>
          )}
        </div>
        {cart.items.length ? (
          <div className="sheet-foot">
            <div className="sumline">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="sumline">
              <span>Delivery</span>
              <strong>{shipping ? money(shipping) : "Free"}</strong>
            </div>
            {discount ? (
              <div className="sumline">
                <span>Discount</span>
                <strong>-{money(discount)}</strong>
              </div>
            ) : null}
            <div className="sumline total">
              <span>Due on delivery</span>
              <strong>{money(total)}</strong>
            </div>
            <button
              className="btn primary"
              style={{ width: "100%", marginTop: 16, padding: 15 }}
              onClick={() => {
                closeCart();
                navigate("checkout");
              }}
            >
              Checkout <Icon name="arrow" />
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

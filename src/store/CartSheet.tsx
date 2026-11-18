import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { money } from "../lib/format";
import { cartItemKey, useCart, type CartItem } from "../lib/cart";
import { availableStock, priceForVariant, variantLabel } from "./productVariants";
import { checkoutDiscount } from "./salePricing";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
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
  onApplyCoupon: (coupon: Doc<"coupons"> | null) => void;
}) {
  const cart = useCart();
  const sales = useQuery(api.sales.activeList) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const toast = useToast();
  const { closeCart, goToCategory } = useStoreUI();
  const typedCode = couponInput.trim();
  const convex = useConvex();
  const [checking, setChecking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  // Move focus into the bag when it opens and give it back when it closes.
  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    return () => (opener.current as HTMLElement | null)?.focus?.();
  }, []);

  const byNumber = (number: number) => products.find((p) => p.number === number);

  const lines = cart.items.flatMap((item) => {
    const product = byNumber(item.number);
    return product ? [{ number: item.number, subtotal: priceForVariant(product, item.variant) * item.qty }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const shipping = shippingTotal(subtotal, settings);
  const discount = checkoutDiscount(lines, appliedCoupon, sales, collections, Date.now());
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = async () => {
    const code = typedCode.toUpperCase();
    if (!code || checking) return;
    setChecking(true);
    try {
      const coupon = await convex.query(api.coupons.validate, { code });
      if (coupon) {
        onApplyCoupon(coupon);
        onCouponInputChange("");
        toast(`Code ${code} applied`);
      } else {
        toast("That code isn't valid or has expired");
      }
    } catch {
      toast("Couldn't check that code. Please try again.");
    } finally {
      setChecking(false);
    }
  };
  const saleOnly = checkoutDiscount(lines, null, sales, collections, Date.now());
  const couponIsBeatenBySale = !!appliedCoupon && discount === saleOnly && saleOnly > 0;

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
      <div className="overlay" onClick={closeCart} aria-hidden="true" />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Shopping bag">
        <div className="sheet-head">
          <div>
            <h2>Your little bag {cart.count ? `(${cart.count})` : ""}</h2>
          </div>
          <button ref={closeRef} className="btn icon-only ghost" onClick={closeCart} aria-label="Close bag">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">
          {cart.items.length ? (
            <>
              {cart.items.map((it) => {
                const p = byNumber(it.number);
                if (!p) return null;
                const available = availableStock(p, it.variant);
                return (
                  <div className="line-item" key={cartItemKey(it)}>
                    <SmartImage src={p.img} alt="" />
                    <div className="li-info">
                      <strong>{p.name}</strong>
                      <small>{variantLabel(p, it.variant) || p.color}</small>
                      {it.qty > available ? (
                        <small className="line-warning">
                          {available ? `Only ${available} left` : "Sold out"} ·{" "}
                          <button type="button" onClick={() => cart.setQty(p.number, available, it.variant)}>
                            {available ? "Update" : "Remove"}
                          </button>
                        </small>
                      ) : null}
                      <div className="qty-step" style={{ width: 106, minWidth: 0, height: 36 }}>
                        <button
                          onClick={() => changeQty(p, it, -1)}
                          aria-label={it.qty === 1 ? `Remove ${p.name}` : `Decrease ${p.name}`}
                        >
                          <Icon name={it.qty === 1 ? "trash" : "minus"} size="sm" />
                        </button>
                        <span aria-label={`Quantity ${it.qty}`}>{it.qty}</span>
                        <button
                          disabled={it.qty >= available}
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
              <div className="coupon-box">
                {appliedCoupon ? (
                  <div className="coupon-applied">
                    <Icon name="tag" size="sm" />
                    <span>
                      <strong>{appliedCoupon.code}</strong>
                      <small>{couponIsBeatenBySale ? "The running sale already gives you a better price" : appliedCoupon.type === "Percentage" ? `${appliedCoupon.value}% off` : `${money(appliedCoupon.value)} off`}</small>
                    </span>
                    <button type="button" onClick={() => onApplyCoupon(null)} aria-label={`Remove code ${appliedCoupon.code}`}>
                      <Icon name="close" size="sm" />
                    </button>
                  </div>
                ) : (
                  <form
                    className="field"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void applyCoupon();
                    }}
                  >
                    <label htmlFor="couponInput">Discount code</label>
                    <div className="coupon-row">
                      <input
                        id="couponInput"
                        placeholder="Enter code"
                        autoCapitalize="characters"
                        autoComplete="off"
                        value={couponInput}
                        onChange={(e) => onCouponInputChange(e.target.value)}
                      />
                      <button className="btn secondary" type="submit" disabled={!typedCode || checking} aria-busy={checking}>
                        {checking ? <span className="spinner" aria-hidden="true" /> : null} Apply
                      </button>
                    </div>
                  </form>
                )}
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

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { SignInButton, useAuth } from "@clerk/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { money, normalizePhone } from "../lib/format";
import { useCart } from "../lib/cart";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { shippingTotal, discountTotal, cartTotal } from "./totals";

// Port of checkout() from src/index.html.
export function CheckoutPage({
  products,
  settings,
  appliedCoupon,
  onOrderPlaced,
}: {
  products: Doc<"products">[];
  settings: Doc<"settings">;
  appliedCoupon: Doc<"coupons"> | null;
  onOrderPlaced: (order: Doc<"orders">) => void;
}) {
  const cart = useCart();
  const sale = useQuery(api.sales.active);
  const toast = useToast();
  const { openCart, goToCategory } = useStoreUI();
  const createCheckout = useMutation(api.orders.createCheckout);
  const { userId } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const byNumber = (number: number) => products.find((p) => p.number === number);

  const subtotal = cart.items.reduce((s, it) => {
    const p = byNumber(it.number);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
  const shipping = shippingTotal(subtotal, settings);
  const discount = discountTotal(subtotal, appliedCoupon, sale?.percentOff);
  const total = cartTotal(subtotal, settings, appliedCoupon, sale?.percentOff);

  if (!cart.items.length) {
    return (
      <div className="empty" style={{ padding: "120px 20px" }}>
        <h3>Your bag is empty.</h3>
        <button className="btn primary" onClick={() => goToCategory("All")}>
          Continue shopping
        </button>
      </div>
    );
  }

  if (settings.guestCheckout === false && !userId) return <div className="empty"><h3>Sign in to place your order</h3><SignInButton mode="modal"><button className="btn primary">Sign in</button></SignInButton></div>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const order = await createCheckout({
        customer: name,
        phone: normalizePhone(phone),
        city,
        address: [street, address, city].filter(Boolean).join(", "),
        notes: notes || undefined,
        items: cart.items.map((i) => ({ number: i.number, qty: i.qty })),
        couponCode: appliedCoupon?.code,
        userId: userId ?? undefined,
      });
      if (!order) throw new Error("Order could not be created");
      onOrderPlaced(order);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shop-checkout">
      <div>
        <button className="mini-breadcrumb" onClick={openCart}>
          <Icon name="back" size="sm" /> Back to bag
        </button>
        <h1>One last thing.</h1>
        <form className="checkout-form" onSubmit={submit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerName">Full name</label>
              <input
                id="customerName"
                name="name"
                required
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="customerPhone">Mobile number</label>
              <input
                id="customerPhone"
                name="phone"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="01xxxxxxxxx"
                pattern="0?1[0-9]{9}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setPhone((p) => (p ? normalizePhone(p) : p))}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerCity">City / Area</label>
              <input
                id="customerCity"
                name="city"
                required
                placeholder="Cairo, Maadi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="customerStreet">Street</label>
              <input
                id="customerStreet"
                name="street"
                required
                placeholder="Street name"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="customerAddress">Building / Apartment</label>
            <input
              id="customerAddress"
              name="address"
              required
              placeholder="Building, floor, apartment"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="customerNotes">
              Order notes <span className="muted">(optional)</span>
            </label>
            <textarea
              id="customerNotes"
              name="notes"
              rows={3}
              placeholder="Anything we should know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="detail-section" style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <Icon name="wallet" size="lg" />
            <div>
              <strong style={{ fontSize: 13 }}>Cash on delivery</strong>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Pay when your order arrives.
              </div>
            </div>
            <Icon name="check" size="sm" />
          </div>
          <button className="btn primary" style={{ padding: 16 }} type="submit" disabled={submitting}>
            Place order · {money(total)} <Icon name="arrow" size="sm" />
          </button>
          <small style={{ color: "#9b9f95" }}>
            Your order will be submitted. Payment is collected on delivery.
          </small>
        </form>
      </div>
      <aside className="summary-card">
        <h3>Your order · {cart.count} items</h3>
        {cart.items.map((it) => {
          const p = byNumber(it.number);
          if (!p) return null;
          return (
            <div className="line-item" style={{ alignItems: "center" }} key={it.number}>
              <img style={{ width: 56, height: 65 }} src={p.img ?? ""} alt="" />
              <div className="li-info">
                <strong>{p.name}</strong>
                <small>Qty {it.qty}</small>
              </div>
              <strong>{money(p.price * it.qty)}</strong>
            </div>
          );
        })}
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
      </aside>
    </div>
  );
}

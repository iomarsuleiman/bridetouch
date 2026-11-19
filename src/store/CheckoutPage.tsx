import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { SignInButton, useAuth } from "@clerk/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { friendlyError, money, normalizePhone } from "../lib/format";
import { useSeo } from "../lib/seo";
import { SmartImage } from "../components/SmartImage";
import { cartItemKey, useCart } from "../lib/cart";
import { availableStock, priceForVariant, variantLabel } from "./productVariants";
import { checkoutDiscount } from "./salePricing";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";
import { shippingTotal } from "./totals";

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
  const sales = useQuery(api.sales.activeList) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const toast = useToast();
  const { openCart, goToCategory } = useStoreUI();
  const createCheckout = useMutation(api.orders.createCheckout);
  const { userId } = useAuth();

  useSeo({ title: "Checkout", noindex: true }, settings.storeName);

  // Returning customers don't retype their details (kept on this device only).
  const [saved] = useState(readSavedDetails);
  const [name, setName] = useState(saved.name ?? "");
  const [phone, setPhone] = useState(saved.phone ?? "");
  const [city, setCity] = useState(saved.city ?? "");
  const [street, setStreet] = useState(saved.street ?? "");
  const [address, setAddress] = useState(saved.address ?? "");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(saved.email ?? "");
  const [website, setWebsite] = useState(""); // bot trap, hidden from people
  const zones = (settings.zones ?? []).filter((z) => z.enabled);
  const [zone, setZone] = useState(() => (saved.zone && zones.some((z) => z.name === saved.zone) ? saved.zone : ""));
  const chosenZone = zones.find((z) => z.name === zone);
  const policies = useQuery(api.pages.listPublished) ?? [];
  const policyLinks = policies.filter((p) => p.kind === "policy");
  const [remember, setRemember] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = /^1[0125][0-9]{8}$/.test(normalizePhone(phone));

  useEffect(() => setError(""), [name, phone, city, street, address]);

  const byNumber = (number: number) => products.find((p) => p.number === number);
  const stockProblems = cart.items.flatMap((item) => {
    const product = byNumber(item.number);
    if (!product) return [];
    const available = availableStock(product, item.variant);
    return item.qty > available ? [{ item, product, available }] : [];
  });

  const lines = cart.items.flatMap((item) => {
    const product = byNumber(item.number);
    return product ? [{ number: item.number, subtotal: priceForVariant(product, item.variant) * item.qty }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const shipping = shippingTotal(subtotal, chosenZone ? { ...settings, shipping: chosenZone.fee } : settings);
  const discount = checkoutDiscount(lines, appliedCoupon, sales, collections, Date.now());
  const total = Math.max(0, subtotal + shipping - discount);

  if (!cart.items.length) {
    return (
      <div className="empty checkout-empty">
        <Icon name="bag" size="xl" />
        <h3>Your bag is empty.</h3>
        <p>Add a few pieces you love, then come back here to check out.</p>
        <button className="btn primary" onClick={() => goToCategory("All")}>
          Start shopping <Icon name="arrow" size="sm" />
        </button>
      </div>
    );
  }

  if (settings.guestCheckout === false && !userId) return <div className="empty checkout-empty"><Icon name="users" size="xl" /><h3>Sign in to place your order</h3><p>Your bag is saved. Sign in to finish checking out.</p><SignInButton mode="modal"><button className="btn primary">Sign in</button></SignInButton></div>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!phoneValid) {
      setPhoneTouched(true);
      document.getElementById("customerPhone")?.focus();
      return;
    }
    if (zones.length && !chosenZone) {
      setError("Choose your delivery area.");
      document.getElementById("customerZone")?.focus();
      return;
    }
    if (stockProblems.length) {
      setError("Some pieces in your bag are no longer available in that quantity. Update your bag to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const order = await createCheckout({
        customer: name,
        phone: normalizePhone(phone),
        city,
        address: [street.trim(), address.trim(), city.trim()].filter(Boolean).join(", "),
        notes: notes.trim() || undefined,
        items: cart.items.map((i) => ({ number: i.number, qty: i.qty, variant: i.variant })),
        couponCode: appliedCoupon?.code,
        userId: userId ?? undefined,
        email: email.trim() || undefined,
        zone: chosenZone?.name,
        website: website || undefined,
      });
      if (!order) throw new Error("Order could not be created");
      try {
        if (remember) localStorage.setItem(DETAILS_KEY, JSON.stringify({ name, phone: normalizePhone(phone), city, street, address, email, zone }));
        else localStorage.removeItem(DETAILS_KEY);
      } catch {
        // storage blocked
      }
      onOrderPlaced(order);
    } catch (err) {
      const message = friendlyError(err, "We couldn't place your order. Please try again.");
      setError(message);
      toast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shop-checkout">
      <div>
        <button type="button" className="mini-breadcrumb back-link" onClick={openCart}>
          <Icon name="back" size="sm" /> Back to bag
        </button>
        <h1>One last thing.</h1>
        <form className="checkout-form" onSubmit={submit} noValidate={false} aria-describedby={error ? "checkout-error" : undefined}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerName">Full name</label>
              <input
                id="customerName"
                name="name"
                required
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={200}
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
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                placeholder="01xxxxxxxxx"
                value={phone}
                aria-invalid={phoneTouched && !phoneValid}
                aria-describedby="phone-hint"
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  setPhoneTouched(!!phone);
                  if (phone && /^1[0125][0-9]{8}$/.test(normalizePhone(phone))) setPhone("0" + normalizePhone(phone));
                }}
              />
              <small id="phone-hint" className={"field-hint" + (phoneTouched && !phoneValid ? " error" : "")}>
                {phoneTouched && !phoneValid ? "Enter an 11-digit Egyptian mobile number, e.g. 010 1234 5678." : "We'll call to confirm delivery."}
              </small>
            </div>
          </div>
          {zones.length ? (
            <div className="field">
              <label htmlFor="customerZone">Delivery area</label>
              <select id="customerZone" required value={zone} onChange={(e) => setZone(e.target.value)} aria-describedby="zone-hint">
                <option value="" disabled>Choose your area…</option>
                {zones.map((z) => (
                  <option key={z.name} value={z.name}>{z.name} · {z.fee ? money(z.fee) : "Free"}{z.eta ? ` · ${z.eta}` : ""}</option>
                ))}
              </select>
              <small id="zone-hint" className="field-hint">{chosenZone?.eta ? `Usually arrives in ${chosenZone.eta}.` : "Delivery fee depends on your area."}</small>
            </div>
          ) : null}
          <div className="grid-2">
            <div className="field">
              <label htmlFor="customerCity">City / Area</label>
              <input
                id="customerCity"
                name="city"
                required
                autoComplete="address-level2"
                enterKeyHint="next"
                maxLength={120}
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
                autoComplete="address-line1"
                enterKeyHint="next"
                maxLength={300}
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
              autoComplete="address-line2"
              enterKeyHint="next"
              maxLength={300}
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
              maxLength={1000}
              placeholder="Landmark, preferred delivery time, gift message…"
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
          <div className="field">
            <label htmlFor="customerEmail">Email <span className="muted">(optional)</span></label>
            <input id="customerEmail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" maxLength={200} placeholder="For your receipt and order updates" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <label className="remember-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Remember my details on this device</span>
          </label>
          {stockProblems.length ? (
            <div className="form-alert" role="alert">
              <Icon name="info" size="sm" />
              <div>
                <strong>Some pieces just sold out.</strong>
                <ul>
                  {stockProblems.map(({ item, product, available }) => (
                    <li key={cartItemKey(item)}>
                      {product.name}{variantLabel(product, item.variant) ? ` (${variantLabel(product, item.variant)})` : ""}: {available ? `only ${available} left` : "sold out"}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => stockProblems.forEach(({ item, product, available }) => cart.setQty(product.number, available, item.variant))}
                >
                  Update my bag
                </button>
              </div>
            </div>
          ) : null}
          {error && !stockProblems.length ? (
            <div className="form-alert" role="alert" id="checkout-error">
              <Icon name="info" size="sm" />
              <div>{error}</div>
            </div>
          ) : null}
          <button className={"btn primary place-order" + (submitting ? " is-loading" : "")} type="submit" disabled={submitting || !!stockProblems.length} aria-busy={submitting}>
            {submitting ? <><span className="spinner" aria-hidden="true" /> Placing your order…</> : <>Place order · {money(total)} <Icon name="arrow" size="sm" /></>}
          </button>
          <small className="muted">
            By placing your order you agree to pay {money(total)} in cash when it arrives. We'll call to confirm before shipping.
            {policyLinks.length ? <> See our {policyLinks.map((p, i) => (
              <span key={p.slug}>{i ? (i === policyLinks.length - 1 ? " and " : ", ") : ""}<a href={`/pages/${p.slug}`} target="_blank" rel="noopener">{p.title.toLowerCase()}</a></span>
            ))}.</> : null}
          </small>
        </form>
      </div>
      <aside className="summary-card">
        <h3>Your order · {cart.count} {cart.count === 1 ? "item" : "items"}</h3>
        {cart.items.map((it) => {
          const p = byNumber(it.number);
          if (!p) return null;
          return (
            <div className="line-item" style={{ alignItems: "center" }} key={cartItemKey(it)}>
              <SmartImage style={{ width: 56, height: 65 }} src={p.img} alt="" />
              <div className="li-info">
                <strong>{p.name}</strong>
                <small>{variantLabel(p, it.variant) ? `${variantLabel(p, it.variant)} · ` : ""}Qty {it.qty}</small>
              </div>
              <strong>{money(priceForVariant(p, it.variant) * it.qty)}</strong>
            </div>
          );
        })}
        <div className="sumline">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <div className="sumline">
          <span>Delivery{chosenZone ? ` · ${chosenZone.name}` : zones.length ? " (choose area)" : ""}</span>
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

const DETAILS_KEY = "bridetouch-checkout-details";
type SavedDetails = { name?: string; phone?: string; city?: string; street?: string; address?: string; email?: string; zone?: string };
function readSavedDetails(): SavedDetails {
  try {
    return JSON.parse(localStorage.getItem(DETAILS_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

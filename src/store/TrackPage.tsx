import { useEffect, useState, type FormEvent } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { linkHandler } from "../hooks/useHashRoute";
import { friendlyError, money, normalizePhone } from "../lib/format";
import { useSeo } from "../lib/seo";

type Found = NonNullable<FunctionReturnType<typeof api.orders.lookup>>;
const STEPS = ["New", "Confirmed", "Making", "Packed", "Shipped", "Delivered"];
const STEP_LABELS: Record<string, string> = { New: "Received", Confirmed: "Confirmed", Making: "Being made", Packed: "Packed", Shipped: "On its way", Delivered: "Delivered" };
const REMEMBER = "bridetouch-track";

export function TrackPage({ settings }: { settings: Doc<"settings"> }) {
  useSeo({ title: "Track your order", noindex: true }, settings.storeName);
  const convex = useConvex();
  const toast = useToast();
  const requestReturn = useMutation(api.orders.requestReturn);
  const params = new URLSearchParams(location.search);
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(REMEMBER) || "{}"); } catch { return {}; } })();
  const [number, setNumber] = useState(params.get("order") ?? saved.number ?? "");
  const [phone, setPhone] = useState(saved.phone ?? "");
  const [order, setOrder] = useState<Found | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");

  async function find(e?: FormEvent) {
    e?.preventDefault();
    const n = Number(String(number).replace(/\D/g, ""));
    if (!n || !normalizePhone(phone)) {
      setError("Enter your order number and the phone number you ordered with.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await convex.query(api.orders.lookup, { number: n, phone });
      if (!result) setError("We couldn't find an order with that number and phone. Check both and try again.");
      setOrder(result);
      try { sessionStorage.setItem(REMEMBER, JSON.stringify({ number: String(n), phone })); } catch { /* ignore */ }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  // Coming back from the confirmation page or a WhatsApp link with details saved: look it up.
  useEffect(() => { if (number && phone) void find(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitReturn(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setBusy(true);
    try {
      await requestReturn({ number: order.number, phone, reason });
      toast("Return requested. We'll be in touch.");
      setReturning(false);
      await find();
    } catch (err) {
      toast(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const cancelled = order?.status === "Cancelled";
  const step = order ? STEPS.indexOf(order.status) : -1;
  const whatsapp = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(order ? `Hi! About my order #BT-${order.number}` : "Hi! I have a question about my order")}` : "";

  return (
    <div className="track-shell">
      <div className="track-head">
        <span className="track-icon"><Icon name="truck" /></span>
        <h1>Track your order</h1>
        <p>Enter the order number from your confirmation and the phone number you used.</p>
      </div>
      <form className="track-form" onSubmit={find}>
        <label className="track-field">
          <span>Order number</span>
          <div className="track-input"><b>#BT-</b><input inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="next" placeholder="1042" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} /></div>
        </label>
        <label className="track-field">
          <span>Phone</span>
          <input type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="search" placeholder="01xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? <span className="spinner" /> : <>Find order <Icon name="arrow" size="sm" /></>}</button>
      </form>
      {error ? <div className="form-alert" role="alert"><Icon name="info" size="sm" /><div>{error}</div></div> : null}

      {order ? (
        <section className="track-result" aria-live="polite">
          <header>
            <div>
              <small>Order #BT-{order.number}</small>
              <h2>{cancelled ? "Cancelled" : STEP_LABELS[order.status] ?? order.status}</h2>
            </div>
            <strong>{money(order.total)}</strong>
          </header>
          {!cancelled ? (
            <ol className="track-steps" style={{ ["--progress" as string]: `${Math.max(0, step) / (STEPS.length - 1)}` }}>
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? "done" : i === step ? "current" : ""}>
                  <span className="dot">{i < step ? <Icon name="check" size="sm" /> : null}</span>
                  <span className="label">{STEP_LABELS[s]}</span>
                </li>
              ))}
            </ol>
          ) : <p className="muted">This order was cancelled. If that's unexpected, contact us.</p>}
          {order.tracking ? (
            <div className="track-courier">
              <Icon name="truck" size="sm" />
              <span>{order.tracking.carrier} · <b>{order.tracking.number}</b></span>
              {order.tracking.url ? <a className="btn secondary small" href={order.tracking.url} target="_blank" rel="noopener noreferrer">Courier tracking <Icon name="external" size="sm" /></a> : null}
            </div>
          ) : null}
          <ul className="track-items">
            {order.items.map((item, i) => (
              <li key={i}><span>{item.name}{item.variant ? <small>{item.variant}</small> : null}</span><span>× {item.qty}</span><b>{money(item.price * item.qty)}</b></li>
            ))}
            <li className="muted"><span>Delivery{order.zone ? ` · ${order.zone}` : ""}</span><span /><b>{order.shippingFee ? money(order.shippingFee) : "Free"}</b></li>
            {order.discount ? <li className="muted"><span>Discount</span><span /><b>-{money(order.discount)}</b></li> : null}
            <li className="total"><span>Pay on delivery</span><span /><b>{money(order.total)}</b></li>
          </ul>

          {order.returnRequest ? (
            <div className="track-return"><Icon name="undo" size="sm" /> Return {order.returnRequest.status.toLowerCase()}{order.returnRequest.note ? `: ${order.returnRequest.note}` : ""}</div>
          ) : order.canRequestReturn ? (
            returning ? (
              <form className="track-return-form" onSubmit={submitReturn}>
                <label htmlFor="reason">Why are you returning it?</label>
                <textarea id="reason" rows={3} maxLength={1000} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size, arrived damaged…" />
                <div className="row">
                  <button type="button" className="btn ghost" onClick={() => setReturning(false)}>Cancel</button>
                  <button type="submit" className="btn primary" disabled={busy || reason.trim().length < 3}>Request return</button>
                </div>
                {order.returnDeadline ? <small className="muted">You can request a return until {new Date(order.returnDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</small> : null}
              </form>
            ) : (
              <button type="button" className="btn secondary" onClick={() => setReturning(true)}><Icon name="undo" size="sm" /> Request a return</button>
            )
          ) : null}
        </section>
      ) : null}

      <div className="track-help">
        <span>Need help?</span>
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp us</a> : null}
        {settings.email ? <a href={`mailto:${settings.email}`}>Email {settings.email}</a> : null}
        <a href="/pages/returns" onClick={linkHandler("pages/returns")}>Returns policy</a>
      </div>
    </div>
  );
}

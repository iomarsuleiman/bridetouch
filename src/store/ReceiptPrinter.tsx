import { BrandLogo } from "../components/BrandLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";

type Stage = "processing" | "printing" | "complete";

// Zigzag torn edge along the bottom of the paper.
function useTornClipPath(teeth = 36, depth = 4) {
  return useMemo(() => {
    const points: string[] = ["0 0", "100% 0", "100% calc(100% - " + depth + "px)"];
    for (let i = 0; i < teeth * 2; i++) {
      const x = 100 - ((i + 1) * 100) / (teeth * 2);
      const y = i % 2 === 0 ? "100%" : `calc(100% - ${depth}px)`;
      points.push(`${x}% ${y}`);
    }
    return `polygon(${points.join(", ")})`;
  }, [teeth, depth]);
}

const SPINNER = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);

const CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export function ReceiptPrinter({
  order,
  settings,
  products,
  children,
}: {
  order: Doc<"orders">;
  settings: Doc<"settings">;
  products: Doc<"products">[];
  children?: React.ReactNode;
}) {
  const toast = useToast();
  const paperRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<Stage>("processing");
  const clipPath = useTornClipPath();

  // Finish independently of animation events, including reduced-motion mode.
  useEffect(() => {
    if (stage === "complete") return;
    const t = setTimeout(() => setStage(stage === "processing" ? "printing" : "complete"), stage === "processing" ? 350 : 1700);
    return () => clearTimeout(t);
  }, [stage]);

  const when = new Date(order._creationTime).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const byNumber = useMemo(() => {
    const m = new Map<number, Doc<"products">>();
    for (const p of products) m.set(p.number, p);
    return m;
  }, [products]);

  const lines = order.items.map((item) => {
    const p = byNumber.get(item.number);
    return {
      name: item.name ?? p?.name ?? "Item",
      cat: p?.category ?? "",
      qty: item.qty,
      amount: (item.price ?? p?.price ?? 0) * item.qty,
    };
  });

  const subtotal = order.subtotal ?? lines.reduce((s, l) => s + l.amount, 0);
  const delivery =
    order.shippingFee ?? (settings.freeShipping && subtotal >= (settings.freeShippingMin ?? 800) ? 0 : settings.shipping);
  const discount = order.discount ?? Math.max(0, subtotal + delivery - order.total);

  async function saveAsImage() {
    if (!paperRef.current) return;
    try {
      const dataUrl = await toPng(paperRef.current, {
        pixelRatio: 2,
        backgroundColor: "#fbf8f0",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `bridetouch-receipt-${order.number}.png`;
      a.click();
      toast("Receipt saved");
    } catch {
      toast("Could not save image");
    }
  }

  return (
    <div className="receipt-page">
      <div className="receipt-intro"><span className="receipt-success">{CHECK} Order confirmed</span><h1>A little handmade joy, on its way.</h1><p>Thank you, {order.customer.split(" ")[0]}. We'll be in touch to arrange delivery.</p></div>
      <section className="receipt-scene" aria-label="Receipt printer" data-stage={stage}>
        {/* machine */}
        <div className="receipt-printer">
          <div className="receipt-printer-head">
            <span className="receipt-printer-logo"><BrandLogo src={settings.logoImage} name={settings.storeName} />{settings.storeName}.</span>
            <span style={{ display: "inline-flex", color: "#d8d3c9", opacity: 0.7 }}>
              <Icon name="receipt" />
            </span>
          </div>
          <div className="receipt-printer-screen">
            <div className="row-top">
              <div className="what">
                <strong>Order #ML-{order.number}</strong>
                <small>Cash on delivery · {order.city}</small>
              </div>
              <div className="amt">
                <small>Total</small>
                <strong>{money(order.total)}</strong>
              </div>
            </div>
            <div className="status" role="status" aria-live="polite">
              {stage === "complete" ? (
                <span className="done">{CHECK}</span>
              ) : (
                <span className="spin">{SPINNER}</span>
              )}
              {stage === "processing" && "Processing your order"}
              {stage === "printing" && "Printing your receipt"}
              {stage === "complete" && "Order confirmed"}
            </div>
          </div>
          <div className="receipt-printer-slot" aria-hidden="true" />
        </div>

        {/* paper */}
        <div
          className={"receipt-window" + (stage === "printing" ? " printing" : "")}
          onAnimationEnd={() => setStage((s) => (s === "printing" ? "complete" : s))}
        >
          <article ref={paperRef} className="receipt-paper" style={{ clipPath }} aria-label="Order receipt">
            <div className="receipt-head">
              <BrandLogo src={settings.logoImage} name={settings.storeName} />
              <div className="brand">{settings.storeName}</div>
              <div className="sub">Handmade boutique</div>
              <div className="when">{when}</div>
            </div>
            <hr className="receipt-rule" />
            <div className="receipt-items">
              {lines.length ? (
                lines.map((l, i) => (
                  <div className="receipt-line" key={i}>
                    <div>
                      <span className="name">
                        {l.name}
                        {l.qty > 1 ? ` × ${l.qty}` : ""}
                      </span>
                      {l.cat ? <span className="cat">{l.cat}</span> : null}
                    </div>
                    <span className="price">{money(l.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="receipt-line">
                  <div>
                    <span className="name">Manual order</span>
                  </div>
                </div>
              )}
            </div>
            <hr className="receipt-rule" />
            <div className="receipt-totals">
              <div className="t">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="t">
                <span>Delivery</span>
                <span>{delivery ? money(delivery) : "Free"}</span>
              </div>
              {discount ? (
                <div className="t">
                  <span>Discount</span>
                  <span>-{money(discount)}</span>
                </div>
              ) : null}
              <div className="t grand">
                <span>Due on delivery</span>
                <span>{money(order.total)}</span>
              </div>
            </div>
            <hr className="receipt-rule" />
            <div className="receipt-meta">
              <span>Order</span>
              <span>#ML-{order.number}</span>
              <span>Customer</span>
              <span>{order.customer}</span>
              <span>Phone</span>
              <span>{order.phone}</span>
              <span>Address</span>
              <span>{order.address}</span>
              <span>Payment</span>
              <span>Cash on delivery</span>
            </div>
            <p className="receipt-note">
              Made with care. Thank you for shopping small.
            </p>
            <div className="receipt-barcode" aria-hidden="true" />
            <div className="receipt-barcode-label">ML {order.number}</div>
          </article>
        </div>
      </section>

      <div className="receipt-actions">
        <button className="btn secondary" onClick={() => window.print()}>
          <Icon name="receipt" size="sm" /> Print
        </button>
        <button className="btn secondary" onClick={saveAsImage}>
          Save as image
        </button>
        {children}
      </div>
    </div>
  );
}

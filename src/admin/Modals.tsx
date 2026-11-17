import { NotificationSetup } from "../components/NotificationSetup";
import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { ImageUpload } from "./ImageUpload";
import { money, formatOrderDate } from "../lib/format";
import { navigate } from "../hooks/useHashRoute";
import { Field } from "./shared";
import { copyText, printOrder } from "./utils";
import type { ModalKey } from "./types";

type ModalsProps = {
  modal: ModalKey;
  products: Doc<"products">[];
  orders: Doc<"orders">[];
  offers: Doc<"offers">[];
  collections: Doc<"collections">[];
  settings: Doc<"settings">;
  selectedProductId: Id<"products"> | null;
  selectedOfferId: Id<"offers"> | null;
  selectedCollectionId: Id<"collections"> | null;
  selectedOrderId: Id<"orders"> | null;
  onClose: () => void;
  onOpenOrder: (id: Id<"orders">) => void;
};

// Shared chrome, ported from the vanilla modal() wrapper.
function ModalShell({
  title,
  large,
  footer,
  onClose,
  children,
}: {
  title: string;
  large?: boolean;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className={"modal" + (large ? " large" : "")} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="modal-head">
          <h2 id="dialog-title">{title}</h2>
          <button className="btn icon-only ghost" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-content">{children}</div>
        <div className="modal-footer">{footer}</div>
      </section>
    </div>
  );
}

// Validity + submit plumbing shared by all form modals.
function useFormModal(onClose: () => void, toast: (m: string) => void) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving,setSaving] = useState(false);
  function check() {
    const f = formRef.current;
    if (f && !f.checkValidity()) {
      f.reportValidity();
      return false;
    }
    return true;
  }
  async function run(action: () => Promise<unknown>) {
    if (saving || !check()) return;
    setSaving(true);
    try {
      await action();
      toast("Changes saved");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save");
    } finally {setSaving(false);}
  }
  const form = (children: ReactNode) => (
    <form ref={formRef} style={{ display: "contents" }} onSubmit={(e) => e.preventDefault()}>
      {children}
    </form>
  );
  const footer = (onSave: () => void) => (
    <>
      <button type="button" className="btn secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="btn primary" onClick={onSave} disabled={saving}>
        Save <Icon name="check" size="sm" />
      </button>
    </>
  );
  return { check, run, form, footer };
}

function ProductModal({
  product,
  onClose,
}: {
  product: Doc<"products"> | null; // null = add mode
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useMutation(api.products.add);
  const update = useMutation(api.products.update);
  const editing = !!product;
  const { check, run, form, footer } = useFormModal(onClose, toast);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? 300));
  const [stock, setStock] = useState(String(product?.stock ?? 1));
  const [category, setCategory] = useState(product?.category ?? "Ceramics");
  const [img, setImg] = useState(product?.img ?? "");
  const [description, setDescription] = useState(product?.description ?? "");

  function save() {
    if (!check()) return;
    run(async () => {
      const payload = {
        name,
        price: Number(price),
        stock: Number(stock),
        category,
        img: img || undefined,
        description: description || undefined,
      };
      if (product) await update({ id: product._id, ...payload });
      else await add(payload);
    });
  }

  return (
    <ModalShell title={editing ? "Edit product" : "Add product"} onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Product name" name="name" value={name} onChange={setName} autoFocus />
          <div className="grid-2">
            <Field label="Price (EGP)" name="price" type="number" min={0} value={price} onChange={setPrice} />
            <Field label="Inventory" name="stock" type="number" min={0} value={stock} onChange={setStock} />
          </div>
          <Field label="Category" name="category" value={category} onChange={setCategory} />
          <ImageUpload label="Product photo" value={img} onChange={setImg} />
          <div className="field">
            <label htmlFor="f-description">Description</label>
            <textarea id="f-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </>,
      )}
    </ModalShell>
  );
}

function DiscountModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const add = useMutation(api.coupons.add);
  const { check, run, form, footer } = useFormModal(onClose, toast);
  const [code, setCode] = useState("HELLO15");
  const [value, setValue] = useState("15");
  const [type, setType] = useState("Percentage");

  function save() {
    if (!check()) return;
    run(async () => {
      await add({ code, value: Number(value), type });
    });
  }

  return (
    <ModalShell title="Create discount" onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Discount code" name="code" value={code} onChange={setCode} pattern="[A-Za-z0-9_-]{3,24}" autoFocus />
          <Field label="Value" name="value" type="number" min={1} value={value} onChange={setValue} />
          <div className="field">
            <label>Discount type</label>
            <div className="status-track">
              <button
                className={type === "Percentage" ? "current" : ""}
                type="button"
                onClick={() => setType("Percentage")}
              >
                Percentage (%)
              </button>
              <button
                className={type === "Fixed amount" ? "current" : ""}
                type="button"
                onClick={() => setType("Fixed amount")}
              >
                Fixed amount
              </button>
            </div>
          </div>
        </>,
      )}
    </ModalShell>
  );
}

function OfferModal({
  offer,
  onClose,
}: {
  offer: Doc<"offers"> | null; // null = add mode
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useMutation(api.offers.add);
  const update = useMutation(api.offers.update);
  const editing = !!offer;
  const { run, form, footer } = useFormModal(onClose, toast);
  const [name, setName] = useState(offer?.name ?? "A little treat");
  const [kind, setKind] = useState(offer?.kind ?? "Campaign");
  const [details, setDetails] = useState(offer?.details ?? "All products");

  function save() {
    run(async () => {
      if (offer) await update({ id: offer._id, name, kind, details });
      else await add({ name, kind, details });
    });
  }

  return (
    <ModalShell title={editing ? "Edit offer" : "Create offer"} onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Offer name" name="name" value={name} onChange={setName} autoFocus />
          <Field label="Offer type" name="kind" value={kind} onChange={setKind} />
          <Field label="Details" name="details" value={details} onChange={setDetails} />
        </>,
      )}
    </ModalShell>
  );
}

function SaleModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const add = useMutation(api.sales.add);
  const { run, form, footer } = useFormModal(onClose, toast);
  const toLocal = (ms: number) =>
    new Date(ms - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const [name, setName] = useState("Weekend flash — 20% off");
  const [percentOff, setPercentOff] = useState("20");
  const [startsAt, setStartsAt] = useState(() => toLocal(Date.now()));
  const [endsAt, setEndsAt] = useState(() =>
    toLocal(Date.now() + 3 * 24 * 60 * 60 * 1000),
  );

  function save() {
    run(async () => {
      await add({
        name,
        percentOff: Number(percentOff),
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      });
    });
  }

  return (
    <ModalShell title="Create sale" onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Sale name" name="name" value={name} onChange={setName} autoFocus />
          <div className="grid-2">
            <Field
              label="Percent off"
              name="percentOff"
              type="number"
              min={1}
              value={percentOff}
              onChange={setPercentOff}
            />
          </div>
          <Field
            label="Starts at"
            name="startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
          />
          <Field
            label="Ends at"
            name="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
          />
          <p className="form-help">
            While the sale is running it applies automatically at checkout — the larger of the
            sale or a customer's coupon code is used.
          </p>
        </>,
      )}
    </ModalShell>
  );
}

function CollectionModal({
  collection,
  defaultImage,
  onClose,
}: {
  collection: Doc<"collections"> | null; // null = add mode
  defaultImage: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useMutation(api.collections.add);
  const update = useMutation(api.collections.update);
  const editing = !!collection;
  const { run, form, footer } = useFormModal(onClose, toast);
  const [name, setName] = useState(collection?.name ?? "New favorites");
  const [image, setImage] = useState(collection?.image ?? defaultImage);
  const products = useQuery(api.products.list) ?? [];
  const [productNumbers, setProductNumbers] = useState(collection?.productNumbers ?? []);

  function save() {
    run(async () => {
      if (collection) await update({ id: collection._id, name, image, productNumbers });
      else await add({ name, image, productNumbers });
    });
  }

  return (
    <ModalShell title={editing ? "Edit collection" : "Create collection"} onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Collection name" name="name" value={name} onChange={setName} autoFocus />
          <ImageUpload label="Collection image" value={image} onChange={setImage} />
          <fieldset className="collection-products"><legend>Products in this collection</legend>{products.map(p => <label key={p._id}><input type="checkbox" checked={productNumbers.includes(p.number)} onChange={e => setProductNumbers(current => e.target.checked ? [...current, p.number] : current.filter(n => n !== p.number))} />{p.name}</label>)}</fieldset>
        </>,
      )}
    </ModalShell>
  );
}

function ShippingModal({
  shipping,
  freeShipping,
  freeShippingMin,
  onClose,
}: {
  shipping: number;
  freeShipping: boolean;
  freeShippingMin?: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useMutation(api.settings.update);
  const { check, run, form, footer } = useFormModal(onClose, toast);
  const [fee, setFee] = useState(String(shipping));
  const [min, setMin] = useState(String(freeShippingMin ?? 800));

  function save() {
    if (!check()) return;
    run(async () => {
      await update({ shipping: Number(fee), freeShippingMin: Number(min) });
    });
  }

  return (
    <ModalShell title="Delivery rates" onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Standard delivery fee (EGP)" name="fee" type="number" min={0} value={fee} onChange={setFee} autoFocus />
          <Field
            label="Free delivery applies from (EGP)"
            name="freeShippingMin"
            type="number"
            min={0}
            value={min}
            onChange={setMin}
          />
          <p className="form-help">
            The store uses one delivery fee for all supported addresses.
            {freeShipping
              ? ` Orders of EGP ${min || 0} or more get free delivery.`
              : " Free delivery is currently disabled; enable it in Settings."}
          </p>
        </>,
      )}
    </ModalShell>
  );
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const createManual = useMutation(api.orders.createManual);
  const { check, run, form, footer } = useFormModal(onClose, toast);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [total, setTotal] = useState("420");
  const [city, setCity] = useState("Cairo");

  function save() {
    if (!check()) return;
    run(async () => {
      await createManual({ name, phone, total: Number(total), city });
    });
  }

  return (
    <ModalShell title="Create manual order" onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Customer" name="name" value={name} onChange={setName} autoFocus />
          <Field label="Phone" name="phone" type="tel" value={phone} onChange={setPhone} />
          <Field label="Amount (EGP)" name="total" type="number" min={0} value={total} onChange={setTotal} />
          <Field label="City" name="city" value={city} onChange={setCity} />
        </>,
      )}
    </ModalShell>
  );
}

function OrderDetailModal({
  order,
  products,
  onClose,
}: {
  order: Doc<"orders">;
  products: Doc<"products">[];
  onClose: () => void;
}) {
  const toast = useToast();
  const updateStatus = useMutation(api.orders.updateStatus);
  const statuses = ["New", "Confirmed", "Making", "Packed", "Shipped", "Delivered", "Cancelled"];
  const payments = ["Unpaid", "Collected", "Settled"];

  async function changeStatus(s: string) {
    // Ported from the vanilla change-order handler: fulfillment follows status.
    const delivery =
      s === "Packed"
        ? "Packed"
        : s === "Shipped"
          ? "With courier"
          : s === "Delivered"
            ? "Delivered"
            : s === "Cancelled"
              ? "Cancelled"
              : undefined;
    try {
      await updateStatus({ id: order._id, status: s, delivery });
      toast("Order marked " + s);
    } catch {
      toast("Could not update order");
    }
  }

  async function changePayment(s: string) {
    try {
      await updateStatus({ id: order._id, payment: s });
      toast("COD status updated");
    } catch {
      toast("Could not update order");
    }
  }

  return (
    <ModalShell
      title={"Order #ML-" + order.number}
      large
      onClose={onClose}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Badge text={order.status} />
        <span style={{ color: "#a4aca2", fontSize: 11 }}>{formatOrderDate(order.date)}</span>
      </div>
      <div className="detail-section">
        <h3>Items</h3>
        {order.items.map((i, idx) => {
          const pr = products.find((p) => p.number === i.number);
          return (
            <div key={idx} className="detail-row">
              <span>
                {(i.name ?? pr?.name ?? "Product") + " × " + i.qty}
              </span>
              <strong>{money((i.price ?? pr?.price ?? 0) * i.qty)}</strong>
            </div>
          );
        })}
        <div className="detail-row" style={{ borderTop: "1px solid #e2e9df", marginTop: 8, paddingTop: 14 }}>
          <span>Total due</span>
          <strong>{money(order.total)}</strong>
        </div>
      </div>
      <div className="grid-2">
        <div className="detail-section">
          <h3>Customer</h3>
          <div style={{ fontSize: 12, lineHeight: 2 }}>
            <strong>{order.customer}</strong>
            <br />
            {order.phone}
            <br />
            {order.city}
          </div>
        </div>
        <div className="detail-section">
          <h3>Delivery address</h3>
          <div style={{ fontSize: 12, lineHeight: 1.75 }}>{order.address}</div>
        </div>
      </div>
      <div className="detail-section">
        <h3>Order status</h3>
        <div className="status-track">
          {statuses.map((s) => (
            <button key={s} className={order.status === s ? "current" : ""} onClick={() => changeStatus(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="detail-section">
        <h3>Cash on delivery · {order.payment}</h3>
        <div className="status-track">
          {payments.map((s) => (
            <button key={s} className={order.payment === s ? "current" : ""} onClick={() => changePayment(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <button className="btn secondary" type="button" onClick={() => printOrder(order, products, toast)}>
          <Icon name="receipt" size="sm" /> Print order
        </button>
        <button className="btn secondary" type="button" onClick={() => copyText(order.phone, toast)}>
          <Icon name="phone" size="sm" /> Copy phone
        </button>
      </div>
    </ModalShell>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      title="Keyboard shortcuts"
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={onClose}>
          Got it
        </button>
      }
    >
      <div className="shortcut-grid">
        <div>
          <span>Search pages</span>
          <span className="kbd">⌘ / Ctrl + K</span>
        </div>
        <div>
          <span>Close dialog</span>
          <span className="kbd">Esc</span>
        </div>
        <div>
          <span>Show shortcuts</span>
          <span className="kbd">?</span>
        </div>
        <div>
          <span>Focus search</span>
          <span className="kbd">/</span>
        </div>
      </div>
    </ModalShell>
  );
}

const COMMAND_PAGES = [
  "overview",
  "orders",
  "products",
  "collections",
  "customers",
  "discounts",
  "sales",
  "offers",
  "analytics",
  "shipping",
  "settings",
];

function CommandModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const matches = COMMAND_PAGES.filter((x) => x.includes(query.toLowerCase()));
  return (
    <ModalShell
      title="Jump to a page"
      onClose={onClose}
      footer={
        <button className="btn secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="search" style={{ width: "100%" }}>
        <Icon name="search" />
        <input
          autoFocus
          aria-label="Search pages"
          placeholder="Search dashboard pages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div style={{ display: "grid", gap: 3 }}>
        {matches.map((x) => (
          <button
            key={x}
            style={{ textAlign: "left", padding: 11, borderRadius: 8 }}
            className="nav-link"
            onClick={() => {
              navigate("admin/" + x);
              onClose();
            }}
          >
            <Icon name="right" size="sm" />
            {x.charAt(0).toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function NotificationsModal({
  orders,
  onClose,
  onOpenOrder,
}: {
  orders: Doc<"orders">[];
  onClose: () => void;
  onOpenOrder: (id: Id<"orders">) => void;
}) {
  const newOrders = orders.filter((o) => o.status === "New");
  return (
    <ModalShell
      title="Notifications"
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <NotificationSetup />
      {newOrders.map((o) => (
        <button
          key={o._id}
          className="detail-section"
          style={{ textAlign: "left", width: "100%" }}
          onClick={() => onOpenOrder(o._id)}
        >
          <strong style={{ fontSize: 12 }}>New order #ML-{o.number}</strong>
          <div className="form-help">
            {o.customer} · {money(o.total)}
          </div>
        </button>
      ))}
      {newOrders.length ? null : <div className="empty">All caught up.</div>}
    </ModalShell>
  );
}

// Port of the vanilla modal() switch.
export function Modals(props: ModalsProps) {
  const { modal } = props;
  switch (modal) {
    case "add-product":
      return <ProductModal product={null} onClose={props.onClose} />;
    case "edit-product": {
      const product = props.products.find((p) => p._id === props.selectedProductId) ?? null;
      if (!product) return null;
      return <ProductModal product={product} onClose={props.onClose} />;
    }
    case "add-discount":
      return <DiscountModal onClose={props.onClose} />;
    case "add-offer":
      return <OfferModal offer={null} onClose={props.onClose} />;
    case "add-sale":
      return <SaleModal onClose={props.onClose} />;
    case "edit-offer": {
      const offer = props.offers.find((o) => o._id === props.selectedOfferId) ?? null;
      if (!offer) return null;
      return <OfferModal offer={offer} onClose={props.onClose} />;
    }
    case "add-collection":
      return (
        <CollectionModal collection={null} defaultImage={props.products[0]?.img ?? ""} onClose={props.onClose} />
      );
    case "edit-collection": {
      const collection = props.collections.find((c) => c._id === props.selectedCollectionId) ?? null;
      if (!collection) return null;
      return <CollectionModal collection={collection} defaultImage="" onClose={props.onClose} />;
    }
    case "edit-shipping":
      return <ShippingModal shipping={props.settings.shipping} freeShipping={props.settings.freeShipping} freeShippingMin={props.settings.freeShippingMin} onClose={props.onClose} />;
    case "new-order":
      return <NewOrderModal onClose={props.onClose} />;
    case "order": {
      const order = props.orders.find((o) => o._id === props.selectedOrderId);
      if (!order) return null;
      return (
        <OrderDetailModal order={order} products={props.products} onClose={props.onClose} />
      );
    }
    case "shortcuts":
      return <ShortcutsModal onClose={props.onClose} />;
    case "command":
      return <CommandModal onClose={props.onClose} />;
    case "notifications":
      return (
        <NotificationsModal
          orders={props.orders}
          onClose={props.onClose}
          onOpenOrder={props.onOpenOrder}
        />
      );
    default:
      return null;
  }
}

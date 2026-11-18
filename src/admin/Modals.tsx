import { friendlyError } from "../lib/format";
import { NotificationSetup } from "../components/NotificationSetup";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { combinations, variantKey } from "../store/productVariants";
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


type OptionDraft = { name: string; values: string[] };
type VariantDraft = { values: string[]; stock: number; price?: number };

function OptionValueInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  function submit() {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  }
  return (
    <div className="option-add-value">
      <input aria-label="New option value" placeholder="Add a value" value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
      <button type="button" className="btn small secondary" onClick={submit}>Add value</button>
    </div>
  );
}

function ProductModal({ product, onClose }: {
  product: Doc<"products"> | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useMutation(api.products.add);
  const update = useMutation(api.products.update);
  const addCategory = useMutation(api.categories.add);
  const categories = useQuery(api.categories.list) ?? [];
  const editing = !!product;
  const { check, run, form, footer } = useFormModal(onClose, toast);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? 300));
  const [stock, setStock] = useState(String(product?.stock ?? 1));
  const [category, setCategory] = useState(product?.category ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [img, setImg] = useState(product?.img ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(() => product?.options?.map((option) => ({
    name: option.name, values: [...option.values],
  })) ?? []);
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => product?.variants?.map((variant) => ({
    values: [...variant.values], stock: variant.stock, price: variant.price,
  })) ?? []);

  const categoryChoices = [...new Set([...categories.map((entry) => entry.name), ...(product?.category ? [product.category] : [])])];
  useEffect(() => {
    if (!category && categoryChoices.length) setCategory(categoryChoices[0]);
  }, [category, categoryChoices.join("|")]);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((current) => current.map((option, i) => i === index ? { ...option, ...patch } : option));
  }
  function addValue(index: number, value: string) {
    setOptions((current) => current.map((option, i) => {
      if (i !== index) return option;
      if (option.values.some((entry) => entry.toLowerCase() === value.toLowerCase())) return option;
      if (option.values.length >= 20) { toast("Use no more than 20 values per property"); return option; }
      return { ...option, values: [...option.values, value] };
    }));
  }
  async function createCategory() {
    const value = newCategory.trim();
    if (!value || addingCategory) return;
    setAddingCategory(true);
    try {
      await addCategory({ name: value });
      setCategory(value);
      setNewCategory("");
      toast("Category saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not add category");
    } finally {
      setAddingCategory(false);
    }
  }

  const readyOptions = options.length === 0 || options.every((option) => option.name.trim() && option.values.length);
  const normalized = options.map((option) => ({
    name: option.name.trim(), values: option.values.map((value) => value.trim()).filter(Boolean),
  }));
  const matrix = options.length && readyOptions ? combinations(normalized) : [];
  function variantRow(values: string[]): VariantDraft {
    return variantRows.find((entry) => variantKey(entry.values) === variantKey(values)) ?? { values, stock: 0 };
  }
  function changeVariant(values: string[], patch: Partial<VariantDraft>) {
    setVariantRows((current) => {
      const existing = current.find((entry) => variantKey(entry.values) === variantKey(values)) ?? { values, stock: 0 };
      return [...current.filter((entry) => variantKey(entry.values) !== variantKey(values)), { ...existing, ...patch }];
    });
  }

  function save() {
    if (!check()) return;
    if (!category.trim()) { toast("Choose or create a category"); return; }
    if (!readyOptions) { toast("Complete each property name and add its values"); return; }
    if (matrix.length > 100) { toast("Use no more than 100 option combinations"); return; }
    run(async () => {
      const rows = matrix.map((values) => variantRow(values));
      const payload = {
        name,
        price: Number(price),
        stock: options.length ? rows.reduce((sum, row) => sum + row.stock, 0) : Number(stock),
        category,
        img: img || undefined,
        description: description || undefined,
        options: options.length ? normalized : undefined,
        variants: options.length ? rows : undefined,
      };
      if (product) await update({ id: product._id, ...payload });
      else await add(payload);
    });
  }

  return (
    <ModalShell title={editing ? "Edit product" : "Add product"} large onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Product name" name="name" value={name} onChange={setName} autoFocus />
          <div className="grid-2">
            <Field label="Base price (EGP)" name="price" type="number" min={0} value={price} onChange={setPrice} />
            <div className="field">
              <label htmlFor="product-stock">Total inventory</label>
              <input id="product-stock" type="number" min={0} step={1} disabled={options.length > 0}
                value={options.length ? matrix.reduce((sum, values) => sum + variantRow(values).stock, 0) : stock}
                onChange={(e) => setStock(e.target.value)} />
              {options.length ? <small>Calculated from variant stock below.</small> : null}
            </div>
          </div>
          <div className="field">
            <label>Category</label>
            <div className="category-picker" role="group" aria-label="Product category">
              {categoryChoices.map((choice) => (
                <button className={"chip" + (category === choice ? " on" : "")} key={choice}
                  aria-pressed={category === choice} type="button" onClick={() => setCategory(choice)}>
                  {choice}
                </button>
              ))}
            </div>
            <div className="option-add-value">
              <input value={newCategory} placeholder="New category" aria-label="New category"
                maxLength={60} onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createCategory(); } }} />
              <button className="btn small secondary" type="button" disabled={!newCategory.trim() || addingCategory}
                onClick={() => void createCategory()}>Create category</button>
            </div>
          </div>
          <ImageUpload label="Product photo" value={img} onChange={setImg} />
          <div className="field">
            <label htmlFor="f-description">Description</label>
            <textarea id="f-description" name="description" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <section className="product-option-section">
            <div className="product-option-heading">
              <div><strong>Options & inventory</strong><small>Color, Size, Material, Finish—or any other property. Stock is saved for each combination.</small></div>
              <button className="btn small secondary" type="button" disabled={options.length >= 5}
                onClick={() => setOptions((current) => [...current, { name: "", values: [] }])}>
                <Icon name="plus" size="sm" /> Add property
              </button>
            </div>
            {options.map((option, index) => (
              <div className="product-option-editor" key={index}>
                <div className="option-name-row">
                  <input aria-label={`Property ${index + 1} name`} placeholder="Property (e.g. Size)"
                    value={option.name} maxLength={40}
                    onChange={(e) => updateOption(index, { name: e.target.value })} />
                  <button type="button" className="row-action" aria-label={`Remove property ${index + 1}`}
                    onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}>
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
                <div className="option-value-chips">
                  {option.values.map((value) => (
                    <span className="option-value-chip" key={value}>{value}
                      <button type="button" aria-label={`Remove ${value}`}
                        onClick={() => updateOption(index, { values: option.values.filter((entry) => entry !== value) })}>×</button>
                    </span>
                  ))}
                </div>
                <OptionValueInput onAdd={(value) => addValue(index, value)} />
              </div>
            ))}
            {options.length && !readyOptions ? <small>Finish every property and add at least one value to set variant inventory.</small> : null}
            {matrix.length ? <div className="variant-stock-table">
              <strong>Inventory by combination ({matrix.length})</strong>
              {matrix.map((values) => {
                const row = variantRow(values);
                return (
                  <div className="variant-stock-row" key={variantKey(values)}>
                    <span>{normalized.map((option, i) => `${option.name}: ${values[i]}`).join(" · ")}</span>
                    <label>Stock<input type="number" step={1} min={0} aria-label={`Stock for ${values.join(" / ")}`}
                      value={row.stock} onChange={(e) => changeVariant(values, { stock: Number(e.target.value) })} /></label>
                    <label>Price (EGP)<input type="number" min={0} step="0.01" placeholder={price || "Base"}
                      aria-label={`Price for ${values.join(" / ")}`}
                      value={row.price ?? ""} onChange={(e) => changeVariant(values, { price: e.target.value ? Number(e.target.value) : undefined })} /></label>
                  </div>
                );
              })}
            </div> : null}
          </section>
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
  const products = useQuery(api.products.list) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const { run, form, footer } = useFormModal(onClose, toast);
  const toLocal = (ms: number) =>
    new Date(ms - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const [name, setName] = useState("");
  const [percentOff, setPercentOff] = useState("20");
  const [startsAt, setStartsAt] = useState(() => toLocal(Date.now()));
  const [endsAt, setEndsAt] = useState(() => toLocal(Date.now() + 3 * 24 * 60 * 60 * 1000));
  const [scope, setScope] = useState<"all" | "products" | "collections">("all");
  const [productNumbers, setProductNumbers] = useState<number[]>([]);
  const [collectionNames, setCollectionNames] = useState<string[]>([]);

  function save() {
    if (scope === "products" && !productNumbers.length) { toast("Select at least one product"); return; }
    if (scope === "collections" && !collectionNames.length) { toast("Select at least one collection"); return; }
    run(async () => {
      await add({
        name, percentOff: Number(percentOff), startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(), scope,
        productNumbers: scope === "products" ? productNumbers : undefined,
        collectionNames: scope === "collections" ? collectionNames : undefined,
      });
    });
  }

  return (
    <ModalShell title="Create sale" large onClose={onClose} footer={footer(save)}>
      {form(
        <>
          <Field label="Sale name" name="name" value={name} onChange={setName} autoFocus />
          <Field label="Discount (%)" name="percentOff" type="number" min={1} value={percentOff} onChange={setPercentOff} />
          <div className="grid-2">
            <Field label="Starts at" name="startsAt" type="datetime-local" value={startsAt} onChange={setStartsAt} />
            <Field label="Ends at" name="endsAt" type="datetime-local" value={endsAt} onChange={setEndsAt} />
          </div>
          <fieldset className="sale-scope">
            <legend>Applies to</legend>
            <div className="category-picker" role="group" aria-label="Sale audience">
              {([["all", "All products"], ["products", "Selected products"], ["collections", "Selected collections"]] as const).map(([value, label]) => (
                <button key={value} className={"chip" + (scope === value ? " on" : "")}
                  type="button" aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>
              ))}
            </div>
            {scope === "products" ? (
              <div className="sale-target-list">
                {products.map((product) => (
                  <label key={product._id}>
                    <input type="checkbox" checked={productNumbers.includes(product.number)}
                      onChange={(e) => setProductNumbers((current) => e.target.checked
                        ? [...current, product.number] : current.filter((number) => number !== product.number))} />
                    <span>{product.name}</span>
                  </label>
                ))}
                {!products.length ? <p>Add a product first.</p> : null}
              </div>
            ) : null}
            {scope === "collections" ? (
              <div className="sale-target-list">
                {collections.map((collection) => (
                  <label key={collection._id}>
                    <input type="checkbox" checked={collectionNames.includes(collection.name)}
                      onChange={(e) => setCollectionNames((current) => e.target.checked
                        ? [...current, collection.name] : current.filter((name) => name !== collection.name))} />
                    <span>{collection.name}</span>
                    <small>{collection.productNumbers?.length ?? 0} products</small>
                  </label>
                ))}
                {!collections.length ? <p>Create a collection and assign products first.</p> : null}
              </div>
            ) : null}
          </fieldset>
          <p className="form-help">The best eligible sale per item is compared with any coupon at checkout. Discounts do not stack.</p>
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
      toast(s === "Cancelled" ? "Order cancelled · items returned to stock" : "Order marked " + s);
    } catch (error) {
      toast(friendlyError(error, "Could not update order"));
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
      title={"Order #BT-" + order.number}
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
          <strong style={{ fontSize: 12 }}>New order #BT-{o.number}</strong>
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

import type { Doc } from "../../convex/_generated/dataModel";
import { formatOrderDate, money, normalizePhone } from "../lib/format";

export const displayPhone = (phone: string) => {
  const digits = normalizePhone(phone);
  return digits.length === 10 ? "0" + digits : phone;
};

function escapeHTML(s: string) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

// Port of the vanilla downloadCSV helper.
// Cells starting with = + - @ would run as formulas in Excel/Sheets.
const safeCell = (v: string | number) => {
  const text = String(v ?? "");
  return typeof v === "string" && /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
};

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => '"' + safeCell(v).replace(/"/g, '""') + '"').join(","))
    .join("\r\n");
  // The BOM makes Excel read Arabic names correctly.
  const u = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportOrders(orders: Doc<"orders">[]) {
  downloadCSV(`bridetouch-orders-${today()}`, [
    ["Order", "Date", "Customer", "Phone", "City", "Address", "Items", "Subtotal", "Delivery", "Discount", "Total", "Status", "Payment", "Notes"],
    ...orders.map((o) => [
      "BT-" + o.number,
      formatOrderDate(o.date),
      o.customer,
      displayPhone(o.phone),
      o.city,
      o.address,
      o.items.map((i) => `${i.name ?? "Product"}${i.variant ? ` (${i.variant})` : ""} x${i.qty}`).join("; "),
      o.subtotal ?? "",
      o.shippingFee ?? "",
      o.discount ?? "",
      o.total,
      o.status,
      o.payment,
      o.notes ?? "",
    ]),
  ]);
}

/** One row per customer (matched by phone), ignoring cancelled orders for spend. */
export function customerSummary(orders: Doc<"orders">[]) {
  const byPhone = new Map<string, { name: string; phone: string; city: string; orders: number; spent: number; last: number }>();
  for (const o of orders) {
    const key = normalizePhone(o.phone) || o.phone;
    const when = o.placedAt ?? (Date.parse(o.date) || 0);
    const entry = byPhone.get(key) ?? { name: o.customer, phone: displayPhone(o.phone), city: o.city, orders: 0, spent: 0, last: 0 };
    entry.orders++;
    if (o.status !== "Cancelled") entry.spent += o.total;
    if (when >= entry.last) Object.assign(entry, { name: o.customer, city: o.city, last: when || entry.last });
    byPhone.set(key, entry);
  }
  return [...byPhone.values()].sort((a, b) => b.spent - a.spent);
}

export function exportCustomers(orders: Doc<"orders">[]) {
  downloadCSV(`bridetouch-customers-${today()}`, [
    ["Customer", "Phone", "City", "Orders", "Spent (EGP)"],
    ...customerSummary(orders).map((c) => [c.name, c.phone, c.city, c.orders, c.spent]),
  ]);
}

// Port of the vanilla clipboard "copy" action.
export function copyText(value: string, toast: (message: string) => void) {
  const fallback = () => {
    // Older iOS / non-secure contexts: copy through a temporary field.
    const field = document.createElement("textarea");
    field.value = value || "";
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;font-size:16px";
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, field.value.length);
    const ok = document.execCommand?.("copy");
    field.remove();
    toast(ok ? "Copied" : "Copy isn't available on this device");
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value || "").then(() => toast("Copied")).catch(fallback);
  } else fallback();
}

// Port of the vanilla printOrder helper.
export function printOrder(
  o: Doc<"orders">,
  products: Doc<"products">[],
  toast: (message: string) => void,
) {
  const productName = (number: number) =>
    products.find((p) => p.number === number)?.name ?? "Product";
  const text =
    "BRIDETOUCH | ORDER #BT-" +
    o.number +
    "\n\nCustomer: " +
    o.customer +
    "\nPhone: " +
    displayPhone(o.phone) +
    "\nAddress: " +
    o.address +
    "\n\nItems:\n" +
    o.items.map((i) => (i.name ?? productName(i.number)) + (i.variant ? " (" + i.variant + ")" : "") + " x " + i.qty).join("\n") +
    (o.notes ? "\n\nNote: " + o.notes : "") +
    "\n\nAmount due (COD): " +
    money(o.total) +
    "\nPayment: " +
    o.payment +
    "\nDelivery: " +
    o.delivery +
    "\n\nCash on delivery. Payment is due when your order arrives.";
  const print = window.open("", "_blank", "width=630,height=740");
  if (print) {
    print.opener = null;
    print.document.write(
      '<!doctype html><html><head><title>Order #BT-' +
        o.number +
        '</title><style>body{font:14px/1.8 system-ui;padding:45px;white-space:pre-wrap;color:#263b29}</style></head><body>' +
        escapeHTML(text) +
        "</body></html>",
    );
    print.document.close();
    print.focus();
    print.print();
  } else {
    toast("Allow popups to print this order");
  }
}

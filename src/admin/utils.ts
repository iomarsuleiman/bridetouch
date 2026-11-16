import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";

function escapeHTML(s: string) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

// Port of the vanilla downloadCSV helper.
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","))
    .join("\r\n");
  const u = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

export function exportOrders(orders: Doc<"orders">[]) {
  downloadCSV("bridetouch-orders", [
    ["Order", "Customer", "Phone", "Total", "Status", "COD"],
    ...orders.map((o) => [o.number, o.customer, o.phone, o.total, o.status, o.payment]),
  ]);
}

export function exportCustomers(orders: Doc<"orders">[]) {
  downloadCSV("bridetouch-customers", [
    ["Customer", "Phone", "City"],
    ...orders.map((o) => [o.customer, o.phone, o.city]),
  ]);
}

// Port of the vanilla clipboard "copy" action.
export function copyText(value: string, toast: (message: string) => void) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator
      .clipboard.writeText(value || "")
      .then(() => toast("Copied"))
      .catch(() => toast("Copy unavailable"));
  }
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
    "BRIDETOUCH | ORDER #ML-" +
    o.number +
    "\n\nCustomer: " +
    o.customer +
    "\nPhone: " +
    o.phone +
    "\nAddress: " +
    o.address +
    "\n\nItems:\n" +
    o.items.map((i) => (i.name ?? productName(i.number)) + " x " + i.qty).join("\n") +
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
      '<!doctype html><html><head><title>Order #ML-' +
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

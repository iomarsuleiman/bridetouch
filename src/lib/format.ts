export function money(n: number | undefined | null) {
  return "EGP " + Number(n || 0).toLocaleString("en-EG");
}

// Egyptian mobile normalizer: 01012345678, 1012345678, +20 10 1234 5678 and
// 00201012345678 all collapse to the same canonical "1012345678".
export function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("20") && digits.length >= 12) digits = digits.slice(2);
  return digits.replace(/^0+/, "");
}

// Maps a status/payment/delivery value to its badge color class.
export function statusVariant(
  v: string,
): "green" | "amber" | "rose" | "blue" | "gray" {
  if (["Delivered", "Settled", "Active", "Collected"].includes(v)) return "green";
  if (["New", "Making", "Packed", "Confirmed"].includes(v)) return "amber";
  if (["Cancelled", "Unpaid"].includes(v)) return "rose";
  if (v === "Shipped") return "blue";
  return "gray";
}

// Orders store an ISO timestamp; show it as a friendly date. Legacy plain
// strings ("Yesterday", "Nov 13, 2026") pass through unchanged.
export function formatOrderDate(value: string) {
  if (!value.includes("T")) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

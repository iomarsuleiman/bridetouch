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

/** Convex wraps server errors as "[CONVEX M(...)] [Request ID: …] Server Error
 *  Uncaught Error: <message> at handler (…)". Show customers just <message>. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return fallback;
  if (/Could not find public function/i.test(raw)) return "This needs a backend update. Run `npx convex deploy`, then try again.";
  if (/failed to fetch|network|connection/i.test(raw)) return "We couldn't reach the shop. Check your connection and try again.";
  const match = raw.match(/Uncaught Error:\s*([^\n]+?)(?:\s+at\s+\S+\s*\(|\n|$)/);
  const message = (match ? match[1] : raw.replace(/^\[CONVEX[^\]]*\]\s*(\[Request ID:[^\]]*\]\s*)?/, "")).trim();
  if (!message || /^Server Error$/i.test(message)) return fallback;
  return message;
}

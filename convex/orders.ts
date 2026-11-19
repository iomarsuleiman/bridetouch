import schema from "./schema";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { normalizePhone } from "../src/lib/format";
import { shippingTotal } from "../src/store/totals";
import { checkoutDiscount } from "../src/store/salePricing";
import { matchVariant, priceForVariant, variantKey, variantLabel } from "../src/store/productVariants";
import { requireAdmin } from "./access";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({...schema.tables.orders.validator.fields,_id:v.id("orders"),_creationTime:v.number()});
export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("orders").withIndex("by_number").order("desc").take(5000);
  },
});

export const createCheckout = mutation({
  args: {
    customer: v.string(),
    phone: v.string(),
    city: v.string(),
    address: v.string(),
    notes: v.optional(v.string()),
    items: v.array(v.object({ number: v.number(), qty: v.number(), variant: v.optional(v.array(v.string())) })),
    couponCode: v.optional(v.string()),
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    zone: v.optional(v.string()),
    // Honeypot: a hidden field real shoppers never fill in. Bots do.
    website: v.optional(v.string()),
  },
  returns: v.union(document, v.null()),
  handler: async (ctx, args) => {
    if (args.website?.trim()) throw new Error("We couldn't place your order. Please try again.");
    const settings = await ctx.db.query("settings").first();
    const identity = await ctx.auth.getUserIdentity();
    if (settings?.guestCheckout === false && !identity) throw new Error("Sign in to place an order");
    if (!args.customer.trim() || !args.city.trim() || !args.address.trim()) throw new Error("Name, city and delivery address are required");
    const phone = normalizePhone(args.phone);
    if (!/^1[0125][0-9]{8}$/.test(phone)) throw new Error("Enter a valid Egyptian mobile number");
    if (args.customer.length > 200 || args.city.length > 200 || args.address.length > 1000 || (args.notes?.length ?? 0) > 2000) throw new Error("Order details are too long");
    if (!args.items.length || args.items.length > 50) throw new Error("Your bag must contain between 1 and 50 products");
    const email = args.email?.trim().toLowerCase() || undefined;
    if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Enter a valid email address, or leave it empty");

    // Fake cash-on-delivery orders cost real courier trips: limit how many
    // orders one phone number can place in a short time.
    const recent = await ctx.db.query("orders").withIndex("by_number").order("desc").take(200);
    const since = Date.now() - 15 * 60 * 1000;
    if (recent.filter((order) => order.phone === phone && (order.placedAt ?? 0) > since).length >= 3) {
      throw new Error("You've placed several orders just now. Please wait a few minutes, or contact us to change an order.");
    }

    // Delivery zones: when the store has any enabled, one must be chosen and
    // its fee is used (free delivery over the threshold still applies).
    const zones = (settings?.zones ?? []).filter((zone) => zone.enabled);
    const zone = zones.length ? zones.find((entry) => entry.name === args.zone) : undefined;
    if (zones.length && !zone) throw new Error("Choose your delivery area");

    // Group by product AND exact variant. Never merge distinct colors or sizes.
    const quantities = new Map<string, { number: number; qty: number; variant?: string[] }>();
    for (const item of args.items) {
      if (!Number.isSafeInteger(item.qty) || item.qty < 1 || !Number.isSafeInteger(item.number)) throw new Error("Invalid product quantity");
      if (item.variant && (item.variant.length > 5 || item.variant.some((value) => value.length > 100))) throw new Error("Invalid product options");
      const key = JSON.stringify([item.number, variantKey(item.variant)]);
      const previous = quantities.get(key);
      quantities.set(key, { number: item.number, qty: (previous?.qty ?? 0) + item.qty, variant: item.variant });
    }

    const lines: { product: Doc<"products">; qty: number; variant?: string[]; unitPrice: number }[] = [];
    const updated = new Map<number, { stock: number; variants?: { values: string[]; stock: number; price?: number }[] }>();
    let subtotal = 0;
    for (const { number, qty, variant } of quantities.values()) {
      const product = await ctx.db.query("products").withIndex("by_number", (q) => q.eq("number", number)).first();
      if (!product || (product.status && product.status !== "active")) throw new Error(`${product?.name ?? "A product in your bag"} is no longer available. Remove it from your bag to continue.`);
      if (product.options?.length) {
        if (!variant || !matchVariant(product, variant)) throw new Error(`Choose valid options for ${product.name}`);
      } else if (variant?.length) throw new Error(`Unexpected options for ${product.name}`);
      const prior = updated.get(number) ?? {
        stock: product.stock,
        variants: product.variants?.map((entry) => ({ ...entry, values: [...entry.values] })),
      };
      const row = prior.variants?.find((entry) => variantKey(entry.values) === variantKey(variant));
      const stock = product.options?.length ? row?.stock ?? 0 : prior.stock;
      if (qty > stock) throw new Error(`Only ${stock} available of ${product.name}`);
      if (row) row.stock -= qty;
      prior.stock -= qty;
      updated.set(number, prior);
      const unitPrice = priceForVariant(product, variant);
      lines.push({ product, qty, variant, unitPrice });
      subtotal += unitPrice * qty;
    }

    let couponDoc;
    if (args.couponCode) {
      couponDoc = await ctx.db.query("coupons").withIndex("by_code", (q) => q.eq("code", args.couponCode!.toUpperCase())).first();
      if (!couponDoc || !couponDoc.active) throw new Error("Invalid coupon code");
    }
    const now = Date.now();
    const sales = await ctx.db.query("sales").take(5000);
    const collections = await ctx.db.query("collections").take(500);
    const discount = checkoutDiscount(
      lines.map(({ product, qty, unitPrice }) => ({ number: product.number, subtotal: unitPrice * qty })),
      couponDoc,
      sales,
      collections,
      now,
    );
    const shipping = shippingTotal(subtotal, settings ? { ...settings, shipping: zone ? zone.fee : settings.shipping } : undefined);
    const total = Math.max(0, subtotal + shipping - discount);
    const max = await ctx.db.query("orders").withIndex("by_number").order("desc").first();
    const number = (max?.number ?? 1020) + 1;
    const orderId = await ctx.db.insert("orders", {
      number,
      customer: args.customer.trim(),
      phone,
      date: new Date(now).toISOString(),
      placedAt: now,
      items: lines.map(({ product, qty, variant, unitPrice }) => ({
        number: product.number, qty, name: product.name, price: unitPrice,
        variant: variantLabel(product, variant) || undefined,
      })),
      subtotal, shippingFee: shipping, discount, total,
      status: "New",
      payment: "Unpaid",
      delivery: "Unfulfilled",
      city: args.city.trim(),
      address: args.address.trim(),
      notes: args.notes?.trim() || undefined,
      userId: identity?.subject,
      email,
      zone: zone?.name,
    });

    for (const [productNumber, changes] of updated) {
      const product = lines.find(({ product }) => product.number === productNumber)!.product;
      await ctx.db.patch(product._id, { stock: changes.stock, variants: changes.variants });
    }
    if (couponDoc) await ctx.db.patch(couponDoc._id, { uses: couponDoc.uses + 1 });
    await ctx.scheduler.runAfter(0, internal.pushDelivery.sendNewOrder, { number });
    return await ctx.db.get(orderId);
  },
});

// Cancelling an order puts its items back on the shelf; reopening a cancelled
// order takes them again (and fails if they have since sold out). Order lines
// store the human-readable variant label, so rows are matched on that label.
async function adjustStock(ctx: MutationCtx, order: Doc<"orders">, direction: 1 | -1) {
  for (const item of order.items) {
    const product = await ctx.db.query("products").withIndex("by_number", (q) => q.eq("number", item.number)).first();
    if (!product) continue; // product deleted since; nothing to restock
    const delta = direction * item.qty;
    if (product.options?.length && item.variant) {
      const variants = product.variants?.map((row) => ({ ...row, values: [...row.values] })) ?? [];
      const row = variants.find((entry) => variantLabel(product, entry.values) === item.variant);
      if (!row) continue;
      if (row.stock + delta < 0) throw new Error(`Only ${row.stock} left of ${product.name} (${item.variant})`);
      row.stock += delta;
      await ctx.db.patch(product._id, { variants, stock: Math.max(0, product.stock + delta) });
    } else {
      if (product.stock + delta < 0) throw new Error(`Only ${product.stock} left of ${product.name}`);
      await ctx.db.patch(product._id, { stock: product.stock + delta });
    }
  }
}

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.optional(v.string()),
    payment: v.optional(v.string()),
    delivery: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, status, payment, delivery }) => {
    await requireAdmin(ctx);
    if (status && !["New","Confirmed","Making","Packed","Shipped","Delivered","Cancelled"].includes(status)) throw new Error("Invalid order status");
    if (payment && !["Unpaid","Collected","Settled"].includes(payment)) throw new Error("Invalid payment status");
    const order = await ctx.db.get(id);
    if (!order) throw new Error("Order not found");
    if (status !== undefined && status !== order.status) {
      if (status === "Cancelled") await adjustStock(ctx, order, 1);
      else if (order.status === "Cancelled") await adjustStock(ctx, order, -1);
    }
    const patch: Record<string, string | number> = {};
    if (status !== undefined) patch.status = status;
    if (status === "Delivered" && order.status !== "Delivered") patch.deliveredAt = Date.now();
    if (payment !== undefined) patch.payment = payment;
    if (delivery !== undefined) patch.delivery = delivery;
    await ctx.db.patch(id, patch);
  },
});

export const createManual = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    total: v.number(),
    city: v.string(),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim() || !args.city.trim() || !Number.isFinite(args.total) || args.total < 0) throw new Error("Enter a name, city and valid total");
    if (!/^1[0125][0-9]{8}$/.test(normalizePhone(args.phone))) throw new Error("Enter a valid Egyptian mobile number");
    const max = await ctx.db
      .query("orders")
      .withIndex("by_number")
      .order("desc")
      .first();
    return await ctx.db.insert("orders", {
      number: (max?.number ?? 1020) + 1,
      customer: args.name.trim(),
      phone: normalizePhone(args.phone),
      date: new Date().toISOString(),
      placedAt: Date.now(),
      items: [],
      total: args.total,
      status: "New",
      payment: "Unpaid",
      delivery: "Unfulfilled",
      city: args.city.trim(),
      address: args.city.trim(),
    });
  },
});

// ---------------------------------------------------------------------------
// Customer order lookup and returns. A customer proves it's their order with
// the order number and the phone number used at checkout.

const publicOrder = v.object({
  number: v.number(),
  date: v.string(),
  status: v.string(),
  payment: v.string(),
  delivery: v.string(),
  items: v.array(v.object({ name: v.string(), qty: v.number(), price: v.number(), variant: v.optional(v.string()) })),
  subtotal: v.number(),
  shippingFee: v.number(),
  discount: v.number(),
  total: v.number(),
  city: v.string(),
  zone: v.optional(v.string()),
  tracking: v.optional(v.object({ carrier: v.string(), number: v.string(), url: v.optional(v.string()) })),
  returnRequest: v.optional(v.object({ reason: v.string(), at: v.number(), status: v.string(), note: v.optional(v.string()) })),
  canRequestReturn: v.boolean(),
  returnDeadline: v.optional(v.number()),
});

async function findOwnOrder(ctx: { db: QueryCtx["db"] }, number: number, phone: string) {
  if (!Number.isSafeInteger(number)) return null;
  const order = await ctx.db.query("orders").withIndex("by_number", (q) => q.eq("number", number)).first();
  if (!order || normalizePhone(order.phone) !== normalizePhone(phone) || !normalizePhone(phone)) return null;
  return order;
}

function returnWindow(order: Doc<"orders">, days: number) {
  if (order.status !== "Delivered") return { allowed: false, deadline: undefined };
  // Counted from delivery; older orders without a delivery date get a week's grace from the order date.
  const from = order.deliveredAt ?? (order.placedAt ?? Date.parse(order.date)) + 7 * 86_400_000;
  const deadline = from + days * 86_400_000;
  return { allowed: !order.returnRequest && Date.now() <= deadline, deadline };
}

export const lookup = query({
  args: { number: v.number(), phone: v.string() },
  returns: v.union(publicOrder, v.null()),
  handler: async (ctx, { number, phone }) => {
    const order = await findOwnOrder(ctx, number, phone);
    if (!order) return null;
    const settings = await ctx.db.query("settings").first();
    const window = returnWindow(order, settings?.returnDays ?? 14);
    return {
      number: order.number,
      date: order.date,
      status: order.status,
      payment: order.payment,
      delivery: order.delivery,
      items: order.items.map((item) => ({ name: item.name ?? "Product", qty: item.qty, price: item.price ?? 0, variant: item.variant })),
      subtotal: order.subtotal ?? order.total,
      shippingFee: order.shippingFee ?? 0,
      discount: order.discount ?? 0,
      total: order.total,
      city: order.city,
      zone: order.zone,
      tracking: order.tracking,
      returnRequest: order.returnRequest,
      canRequestReturn: window.allowed,
      returnDeadline: window.deadline,
    };
  },
});

export const requestReturn = mutation({
  args: { number: v.number(), phone: v.string(), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, { number, phone, reason }) => {
    const order = await findOwnOrder(ctx, number, phone);
    if (!order) throw new Error("We couldn't find that order. Check the order number and phone.");
    const text = reason.trim();
    if (text.length < 3 || text.length > 1000) throw new Error("Tell us briefly why you're returning it");
    const settings = await ctx.db.query("settings").first();
    if (order.returnRequest) throw new Error("A return was already requested for this order");
    if (!returnWindow(order, settings?.returnDays ?? 14).allowed) throw new Error("This order can't be returned online. Please contact us.");
    await ctx.db.patch(order._id, { returnRequest: { reason: text, at: Date.now(), status: "Requested" } });
    await ctx.db.insert("activity", { at: Date.now(), kind: "return", message: `Return requested for order #BT-${order.number}` });
    return null;
  },
});

export const updateReturn = mutation({
  args: { id: v.id("orders"), status: v.string(), note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, status, note }) => {
    await requireAdmin(ctx);
    if (!["Requested", "Approved", "Rejected", "Refunded"].includes(status)) throw new Error("Unknown return status");
    const order = await ctx.db.get(id);
    if (!order?.returnRequest) throw new Error("This order has no return request");
    await ctx.db.patch(id, { returnRequest: { ...order.returnRequest, status, note: note?.trim().slice(0, 500) || order.returnRequest.note } });
    return null;
  },
});

export const setTracking = mutation({
  args: { id: v.id("orders"), carrier: v.string(), number: v.string(), url: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, carrier, number, url }) => {
    await requireAdmin(ctx);
    if (!carrier.trim() && !number.trim()) {
      await ctx.db.patch(id, { tracking: undefined });
      return null;
    }
    if (url && !/^https:\/\//i.test(url.trim())) throw new Error("Tracking links must start with https://");
    await ctx.db.patch(id, { tracking: { carrier: carrier.trim().slice(0, 60), number: number.trim().slice(0, 80), url: url?.trim() || undefined } });
    return null;
  },
});

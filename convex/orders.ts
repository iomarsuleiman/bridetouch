import schema from "./schema";
import { internal } from "./_generated/api";
import { normalizePhone } from "../src/lib/format";
import { shippingTotal } from "../src/store/totals";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
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
    items: v.array(v.object({ number: v.number(), qty: v.number() })),
    couponCode: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.union(document,v.null()),
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("settings").first();
    const identity = await ctx.auth.getUserIdentity();
    if (settings?.guestCheckout === false && !identity) throw new Error("Sign in to place an order");
    if (!args.customer.trim() || !args.city.trim() || !args.address.trim()) throw new Error("Name, city and delivery address are required");
    const phone = normalizePhone(args.phone);
    if (!/^1[0125][0-9]{8}$/.test(phone)) throw new Error("Enter a valid Egyptian mobile number");
    if (args.customer.length > 200 || args.address.length > 1000 || (args.notes?.length ?? 0) > 2000) throw new Error("Order details are too long");
    if (!args.items.length || args.items.length > 50) throw new Error("Your bag must contain between 1 and 50 products");
    const quantities = new Map<number,number>();
    for (const item of args.items) {
      if (!Number.isSafeInteger(item.qty) || item.qty < 1 || !Number.isSafeInteger(item.number)) throw new Error("Invalid product quantity");
      quantities.set(item.number,(quantities.get(item.number) ?? 0)+item.qty);
    }
    // Validate stock and gather product snapshots
    const lines = [];
    let subtotal = 0;
    for (const [number, qty] of quantities) {
      const item = {number, qty};
      const product = await ctx.db
        .query("products")
        .withIndex("by_number", (q) => q.eq("number", item.number))
        .first();
      if (!product) throw new Error(`Unknown product ${item.number}`);
      if (product.stock < item.qty)
        throw new Error(`Only ${product.stock} available of ${product.name}`);
      subtotal += product.price * item.qty;
      lines.push({ product, qty: item.qty });
    }

    // Discount: coupon code vs. best active timed sale — the larger applies.
    let discount = 0;
    let couponDoc;
    if (args.couponCode) {
      couponDoc = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", args.couponCode!.toUpperCase()))
        .first();
      if (!couponDoc || !couponDoc.active) throw new Error("Invalid coupon code");
      discount =
        couponDoc.type === "Percentage"
          ? Math.round((subtotal * couponDoc.value) / 100)
          : Math.min(subtotal, couponDoc.value);
    }
    const now = Date.now();
    const sales = await ctx.db.query("sales").take(5000);
    const sale = sales
      .filter((s) => s.active && s.startsAt <= now && now <= s.endsAt)
      .sort((a, b) => b.percentOff - a.percentOff)[0];
    if (sale) {
      discount = Math.max(discount, Math.round((subtotal * sale.percentOff) / 100));
    }

    // Use the same configurable delivery calculation as the cart and checkout UI.
    const shipping = shippingTotal(subtotal, settings ?? undefined);
    const total = Math.max(0, subtotal + shipping - discount);

    const max = await ctx.db
      .query("orders")
      .withIndex("by_number")
      .order("desc")
      .first();

    const orderId = await ctx.db.insert("orders", {
      number: (max?.number ?? 1020) + 1,
      customer: args.customer.trim(),
      phone,
      date: new Date().toISOString(),
      placedAt: Date.now(),
      items: lines.map(({product,qty}) => ({number:product.number, qty, name:product.name, price:product.price})),
      subtotal, shippingFee:shipping, discount,
      total,
      status: "New",
      payment: "Unpaid",
      delivery: "Unfulfilled",
      city: args.city,
      address: args.address,
      notes: args.notes,
      userId: identity?.subject,
    });

    // Decrement stock and record coupon use
    for (const { product, qty } of lines) {
      await ctx.db.patch(product._id, { stock: Math.max(0, product.stock - qty) });
    }
    if (couponDoc) await ctx.db.patch(couponDoc._id, { uses: couponDoc.uses + 1 });

    await ctx.scheduler.runAfter(0, internal.pushDelivery.sendNewOrder, {number:(max?.number ?? 1020)+1});
    const order = await ctx.db.get(orderId);
    return order;
  },
});

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
    const patch: Record<string, string> = {};
    if (status !== undefined) patch.status = status;
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
      customer: args.name,
      phone: args.phone,
      date: new Date().toISOString(),
      placedAt: Date.now(),
      items: [],
      total: args.total,
      status: "New",
      payment: "Unpaid",
      delivery: "Unfulfilled",
      city: args.city,
      address: args.city,
    });
  },
});

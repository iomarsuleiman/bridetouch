import schema from "./schema";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({...schema.tables.coupons.validator.fields,_id:v.id("coupons"),_creationTime:v.number()});
export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("coupons").take(5000);
  },
});

// Validates a code case-insensitively; returns the active coupon or null.
export const validate = query({
  args: { code: v.string() },
  returns: v.union(document,v.null()),
  handler: async (ctx, { code }) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();
    if (!coupon || !coupon.active) return null;
    return coupon;
  },
});

export const add = mutation({
  args: {
    code: v.string(),
    value: v.number(),
    type: v.string(),
  },
  returns: v.id("coupons"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.code.trim() || !["Percentage","Fixed amount"].includes(args.type) || !Number.isFinite(args.value) || args.value <= 0 || (args.type === "Percentage" && args.value > 100)) throw new Error("Enter a valid code and discount");
    const code = args.code.trim().toUpperCase();
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("That code already exists");
    return await ctx.db.insert("coupons", {
      code,
      value: args.value,
      type: args.type,
      uses: 0,
      active: true,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("coupons") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const coupon = await ctx.db.get(id);
    if (!coupon) return;
    await ctx.db.patch(id, { active: !coupon.active });
  },
});

export const remove = mutation({
  args: { id: v.id("coupons") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});

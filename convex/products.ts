import schema from "./schema";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({...schema.tables.products.validator.fields,_id:v.id("products"),_creationTime:v.number()});
export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    return await ctx.db.query("products").withIndex("by_number").take(5000);
  },
});

export const getByNumber = query({
  args: { number: v.number() },
  returns: v.union(document,v.null()),
  handler: async (ctx, { number }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_number", (q) => q.eq("number", number))
      .first();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    stock: v.number(),
    category: v.string(),
    img: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim() || !args.category.trim() || args.price < 0 || !Number.isFinite(args.price) || !Number.isSafeInteger(args.stock) || args.stock < 0) throw new Error("Enter a name, category, valid price and whole stock quantity");
    const max = await ctx.db
      .query("products")
      .withIndex("by_number")
      .order("desc")
      .first();
    return await ctx.db.insert("products", {
      number: (max?.number ?? 0) + 1,
      tag: "New",
      color: "Original",
      ...args,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    price: v.number(),
    stock: v.number(),
    category: v.string(),
    img: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (!fields.name.trim() || !fields.category.trim() || fields.price < 0 || !Number.isFinite(fields.price) || !Number.isSafeInteger(fields.stock) || fields.stock < 0) throw new Error("Enter valid product details");
    await ctx.db.patch(id, fields);
  },
});


import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
const collection = v.object({_id:v.id("collections"),_creationTime:v.number(),name:v.string(),image:v.string(),count:v.number(),productNumbers:v.optional(v.array(v.number()))});

export const list = query({
  args: {},
  returns: v.array(collection),
  handler: async (ctx) => {
    return await ctx.db.query("collections").take(200);
  },
});

export const add = mutation({
  args: { name: v.string(), image: v.string(), productNumbers: v.optional(v.array(v.number())) },
  returns: v.id("collections"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim()) throw new Error("Collection name is required");
    return await ctx.db.insert("collections", { ...args, count: args.productNumbers?.length ?? 0 });
  },
});

export const update = mutation({
  args: { id: v.id("collections"), name: v.string(), image: v.string(), productNumbers: v.optional(v.array(v.number())) },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (!fields.name.trim()) throw new Error("Collection name is required");
    await ctx.db.patch(id, { ...fields, count: fields.productNumbers?.length ?? 0 });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});

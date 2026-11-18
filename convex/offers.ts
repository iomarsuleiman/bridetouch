import schema from "./schema";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({...schema.tables.offers.validator.fields,_id:v.id("offers"),_creationTime:v.number()});
export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    return await ctx.db.query("offers").take(5000);
  },
});

export const add = mutation({
  args: { name: v.string(), kind: v.string(), details: v.string() },
  returns: v.id("offers"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("offers", { ...args, active: true });
  },
});

export const update = mutation({
  args: { id: v.id("offers"), name: v.string(), kind: v.string(), details: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, fields);
  },
});

export const toggle = mutation({
  args: { id: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const offer = await ctx.db.get(id);
    if (!offer) return;
    await ctx.db.patch(id, { active: !offer.active });
  },
});

export const remove = mutation({
  args: { id: v.id("offers") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});

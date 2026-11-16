import schema from "./schema";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({...schema.tables.sales.validator.fields,_id:v.id("sales"),_creationTime:v.number()});
export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    return await ctx.db.query("sales").take(5000);
  },
});

// The currently-running sale with the biggest discount, if any.
export const active = query({
  args: {},
  returns: v.union(document,v.null()),
  handler: async (ctx) => {
    const now = Date.now();
    const sales = await ctx.db.query("sales").take(5000);
    return (
      sales
        .filter((s) => s.active && s.startsAt <= now && now <= s.endsAt)
        .sort((a, b) => b.percentOff - a.percentOff)[0] ?? null
    );
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    percentOff: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
  },
  returns: v.id("sales"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.endsAt <= args.startsAt) throw new Error("End time must be after start time");
    if (args.percentOff <= 0 || args.percentOff > 100)
      throw new Error("Percent off must be between 1 and 100");
    return await ctx.db.insert("sales", { ...args, active: true });
  },
});

export const toggle = mutation({
  args: { id: v.id("sales") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const sale = await ctx.db.get(id);
    if (!sale) return;
    await ctx.db.patch(id, { active: !sale.active });
  },
});


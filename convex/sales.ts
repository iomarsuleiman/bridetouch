import schema from "./schema";
import { requireAdmin } from "./access";
import { logActivity } from "./activity";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({ ...schema.tables.sales.validator.fields, _id: v.id("sales"), _creationTime: v.number() });

function scopeSummary(scope?: string, productNumbers?: number[], collectionNames?: string[]) {
  if (scope === "products") return `${productNumbers?.length ?? 0} product${productNumbers?.length === 1 ? "" : "s"}`;
  if (scope === "collections") return (collectionNames ?? []).join(", ") || "collections";
  return "all products";
}

export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    return await ctx.db.query("sales").take(5000);
  },
});

// Every sale that is running right now. Pricing uses all of them so a
// product-scoped sale and a collection sale can stack per line.
export const activeList = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    const now = Date.now();
    const sales = await ctx.db.query("sales").take(5000);
    return sales
      .filter((s) => s.active && s.startsAt <= now && now <= s.endsAt)
      .sort((a, b) => b.percentOff - a.percentOff);
  },
});

// The currently-running sale with the biggest discount, if any — used by the
// promo banner.
export const active = query({
  args: {},
  returns: v.union(document, v.null()),
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
    scope: v.optional(v.string()),
    productNumbers: v.optional(v.array(v.number())),
    collectionNames: v.optional(v.array(v.string())),
  },
  returns: v.id("sales"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.endsAt <= args.startsAt) throw new Error("End time must be after start time");
    if (args.percentOff <= 0 || args.percentOff > 100) throw new Error("Percent off must be between 1 and 100");
    const scope = args.scope ?? "all";
    if (!["all", "products", "collections"].includes(scope)) throw new Error("Choose what the sale applies to");

    let productNumbers: number[] | undefined;
    let collectionNames: string[] | undefined;
    if (scope === "products") {
      productNumbers = [...new Set(args.productNumbers ?? [])];
      if (!productNumbers.length) throw new Error("Select at least one product");
      const products = await ctx.db.query("products").take(5000);
      const known = new Set(products.map((product) => product.number));
      if (productNumbers.some((number) => !known.has(number))) throw new Error("One of those products no longer exists");
    }
    if (scope === "collections") {
      collectionNames = [...new Set(args.collectionNames ?? [])].filter(Boolean);
      if (!collectionNames.length) throw new Error("Select at least one collection");
      const collections = await ctx.db.query("collections").take(500);
      const known = new Set(collections.map((collection) => collection.name));
      if (collectionNames.some((name) => !known.has(name))) throw new Error("One of those collections no longer exists");
    }

    const id = await ctx.db.insert("sales", {
      name: args.name.trim(),
      percentOff: args.percentOff,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      active: true,
      scope,
      productNumbers,
      collectionNames,
    });
    await logActivity(
      ctx,
      "sale.created",
      `Created sale “${args.name.trim()}” — ${args.percentOff}% off ${scopeSummary(scope, productNumbers, collectionNames)}`,
    );
    return id;
  },
});

export const toggle = mutation({
  args: { id: v.id("sales") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const sale = await ctx.db.get(id);
    if (!sale) return null;
    await ctx.db.patch(id, { active: !sale.active });
    await logActivity(ctx, "sale.toggled", `${sale.active ? "Paused" : "Activated"} sale “${sale.name}”`);
    return null;
  },
});

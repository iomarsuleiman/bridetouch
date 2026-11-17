import { requireAdmin } from "./access";
import { logActivity } from "./activity";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const clean = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, 60);

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      position: v.number(),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("categories").withIndex("by_position").take(200);
  },
});

export const add = mutation({
  args: { name: v.string() },
  returns: v.id("categories"),
  handler: async (ctx, { name }) => {
    await requireAdmin(ctx);
    const value = clean(name);
    if (!value) throw new Error("Enter a category name");
    const existing = await ctx.db.query("categories").withIndex("by_name", (q) => q.eq("name", value)).first();
    if (existing) throw new Error("That category already exists");
    const last = await ctx.db.query("categories").withIndex("by_position").order("desc").first();
    const id = await ctx.db.insert("categories", { name: value, position: (last?.position ?? -1) + 1 });
    await logActivity(ctx, "category.created", `Created category “${value}”`);
    return id;
  },
});

export const rename = mutation({
  args: { id: v.id("categories"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, name }) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(id);
    if (!category) throw new Error("Category not found");
    const value = clean(name);
    if (!value) throw new Error("Enter a category name");
    if (value === category.name) return null;
    const duplicate = await ctx.db.query("categories").withIndex("by_name", (q) => q.eq("name", value)).first();
    if (duplicate && duplicate._id !== id) throw new Error("That category already exists");

    await ctx.db.patch(id, { name: value });

    // Keep products and the storefront nav pointing at the new name.
    const products = await ctx.db.query("products").take(5000);
    for (const product of products) {
      if (product.category === category.name) await ctx.db.patch(product._id, { category: value });
    }
    const settings = await ctx.db.query("settings").first();
    if (settings?.navigation?.includes(category.name)) {
      await ctx.db.patch(settings._id, {
        navigation: settings.navigation.map((entry) => (entry === category.name ? value : entry)),
      });
    }
    await logActivity(ctx, "category.renamed", `Renamed category “${category.name}” to “${value}”`);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get(id);
    if (!category) return null;
    const products = await ctx.db.query("products").take(5000);
    const used = products.filter((product) => product.category === category.name).length;
    if (used) throw new Error(`Move ${used} product${used === 1 ? "" : "s"} to another category first`);

    const settings = await ctx.db.query("settings").first();
    if (settings?.navigation?.includes(category.name)) {
      await ctx.db.patch(settings._id, {
        navigation: settings.navigation.filter((entry) => entry !== category.name),
      });
    }
    await ctx.db.delete(id);
    await logActivity(ctx, "category.deleted", `Deleted category “${category.name}”`);
    return null;
  },
});

import schema from "./schema";
import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const document = v.object({ ...schema.tables.products.validator.fields, _id: v.id("products"), _creationTime: v.number() });
const optionArg = v.object({ name: v.string(), values: v.array(v.string()) });
const variantArg = v.object({ values: v.array(v.string()), stock: v.number(), price: v.optional(v.number()) });

export const list = query({
  args: {},
  returns: v.array(document),
  handler: async (ctx) => {
    return await ctx.db.query("products").withIndex("by_number").take(5000);
  },
});

export const getByNumber = query({
  args: { number: v.number() },
  returns: v.union(document, v.null()),
  handler: async (ctx, { number }) => {
    return await ctx.db
      .query("products")
      .withIndex("by_number", (q) => q.eq("number", number))
      .first();
  },
});

// Options are arbitrary (Color, Size, Material…) — values are kept in the
// order the admin typed them, and each combination becomes a stock row.
function cleanOptions(options: { name: string; values: string[] }[]) {
  const seen = new Set<string>();
  const cleaned = [];
  for (const option of options) {
    const name = option.name.trim().slice(0, 40);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Option “${name}” is listed twice`);
    seen.add(key);
    const values = [...new Set(option.values.map((value) => value.trim()).filter(Boolean))];
    if (!values.length) throw new Error(`Add at least one value for “${name}”`);
    if (values.length > 20) throw new Error(`“${name}” has too many values`);
    cleaned.push({ name, values: values.slice(0, 40) });
  }
  if (cleaned.length > 5) throw new Error("Use up to 5 options per product");
  return cleaned;
}

function cleanVariants(
  options: { name: string; values: string[] }[],
  variants: { values: string[]; stock: number; price?: number }[] | undefined,
) {
  if (!options.length) return undefined;
  if (!variants?.length) throw new Error("Add stock for each option combination");
  const expected = options.reduce((total, option) => total * option.values.length, 1);
  if (variants.length !== expected) throw new Error("Stock every option combination");
  const seen = new Set<string>();
  const cleaned = variants.map((variant) => {
    if (variant.values.length !== options.length) throw new Error("Invalid option combination");
    variant.values.forEach((value, index) => {
      if (!options[index].values.includes(value)) throw new Error("Invalid option value");
    });
    const key = variant.values.join(" / ");
    if (seen.has(key)) throw new Error("Duplicate option combination");
    seen.add(key);
    if (!Number.isSafeInteger(variant.stock) || variant.stock < 0) throw new Error("Variant stock must be a whole number");
    if (variant.price !== undefined && (!Number.isFinite(variant.price) || variant.price < 0)) throw new Error("Variant price must be zero or greater");
    return { values: variant.values, stock: variant.stock, price: variant.price };
  });
  return cleaned;
}

async function assertCategory(ctx: Parameters<typeof requireAdmin>[0] extends never ? never : any, category: string) {
  const categories = await ctx.db.query("categories").take(200);
  if (categories.length && !categories.some((entry: { name: string }) => entry.name === category)) {
    throw new Error("Choose a category from your category list");
  }
}

export const add = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    stock: v.number(),
    category: v.string(),
    img: v.optional(v.string()),
    description: v.optional(v.string()),
    options: v.optional(v.array(optionArg)),
    variants: v.optional(v.array(variantArg)),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim() || !args.category.trim()) throw new Error("Enter a name and category");
    if (args.price < 0 || !Number.isFinite(args.price)) throw new Error("Enter a valid price");
    await assertCategory(ctx, args.category);

    const options = cleanOptions(args.options ?? []);
    const variants = cleanVariants(options, args.variants);
    const stock = variants ? variants.reduce((total, variant) => total + variant.stock, 0) : args.stock;
    if (!Number.isSafeInteger(stock) || stock < 0) throw new Error("Enter a whole stock quantity");

    const max = await ctx.db
      .query("products")
      .withIndex("by_number")
      .order("desc")
      .first();
    return await ctx.db.insert("products", {
      number: (max?.number ?? 0) + 1,
      tag: "New",
      color: options[0]?.values[0] ?? "Original",
      name: args.name.trim(),
      price: args.price,
      stock,
      category: args.category,
      img: args.img,
      description: args.description,
      options: options.length ? options : undefined,
      variants,
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
    options: v.optional(v.array(optionArg)),
    variants: v.optional(v.array(variantArg)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.name.trim() || !args.category.trim()) throw new Error("Enter a name and category");
    if (args.price < 0 || !Number.isFinite(args.price)) throw new Error("Enter a valid price");
    await assertCategory(ctx, args.category);

    const options = cleanOptions(args.options ?? []);
    const variants = cleanVariants(options, args.variants);
    const stock = variants ? variants.reduce((total, variant) => total + variant.stock, 0) : args.stock;
    if (!Number.isSafeInteger(stock) || stock < 0) throw new Error("Enter a whole stock quantity");

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      price: args.price,
      stock,
      category: args.category,
      img: args.img,
      description: args.description,
      options: options.length ? options : undefined,
      variants,
    });
    return null;
  },
});

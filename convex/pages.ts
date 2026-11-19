import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin } from "./access";
import schema from "./schema";

const page = v.object({ ...schema.tables.pages.validator.fields, _id: v.id("pages"), _creationTime: v.number() });
const summary = v.object({ slug: v.string(), title: v.string(), kind: v.optional(v.string()) });
const RESERVED = new Set(["admin", "catalog", "checkout", "confirmation", "product", "track", "shop", "api", "assets"]);

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Published pages for the footer and navigation. */
export const listPublished = query({
  args: {},
  returns: v.array(summary),
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").withIndex("by_position").take(100);
    return pages.filter((p) => p.published).map(({ slug, title, kind }) => ({ slug, title, kind }));
  },
});

export const listAll = query({
  args: {},
  returns: v.array(page),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("pages").withIndex("by_position").take(100);
  },
});

/** A page by its address. Drafts are visible to administrators only (preview). */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(page, v.null()),
  handler: async (ctx, { slug }) => {
    const found = await ctx.db.query("pages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (!found) return null;
    if (found.published || (await isAdmin(ctx))) return found;
    return null;
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("pages")),
    title: v.string(),
    slug: v.optional(v.string()),
    body: v.string(),
    published: v.boolean(),
    kind: v.optional(v.string()),
  },
  returns: v.id("pages"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const title = args.title.trim().slice(0, 120);
    if (!title) throw new Error("Give the page a title");
    if (args.body.length > 50_000) throw new Error("This page is too long");
    const slug = slugify(args.slug?.trim() || title);
    if (!slug) throw new Error("Choose a page address using letters or numbers");
    if (RESERVED.has(slug)) throw new Error(`“${slug}” is reserved. Choose another page address.`);
    const clash = await ctx.db.query("pages").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (clash && clash._id !== args.id) throw new Error(`Another page already uses /pages/${slug}`);
    const kind = args.kind === "policy" ? "policy" : "page";
    if (args.id) {
      await ctx.db.patch(args.id, { title, slug, body: args.body, published: args.published, kind, updatedAt: Date.now() });
      return args.id;
    }
    const last = await ctx.db.query("pages").withIndex("by_position").order("desc").first();
    return await ctx.db.insert("pages", { title, slug, body: args.body, published: args.published, kind, position: (last?.position ?? -1) + 1, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("pages") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    if (await ctx.db.get(id)) await ctx.db.delete(id);
    return null;
  },
});

export const move = mutation({
  args: { id: v.id("pages"), direction: v.union(v.literal(-1), v.literal(1)) },
  returns: v.null(),
  handler: async (ctx, { id, direction }) => {
    await requireAdmin(ctx);
    const pages = await ctx.db.query("pages").withIndex("by_position").take(100);
    const index = pages.findIndex((p) => p._id === id);
    const other = pages[index + direction];
    if (index < 0 || !other) return null;
    await ctx.db.patch(id, { position: other.position });
    await ctx.db.patch(other._id, { position: pages[index].position });
    return null;
  },
});

/** Adds starter pages that don't exist yet, as unpublished drafts to review. */
export const createStarterPages = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await ctx.db.query("settings").first();
    const store = settings?.storeName || "our store";
    const email = settings?.email || "our email";
    const days = settings?.returnDays ?? 14;
    const pages = await ctx.db.query("pages").withIndex("by_position").take(100);
    let position = (pages.at(-1)?.position ?? -1) + 1;
    let created = 0;
    for (const template of starterPages(store, email, days)) {
      if (pages.some((p) => p.slug === template.slug)) continue;
      await ctx.db.insert("pages", { ...template, published: false, position: position++, updatedAt: Date.now() });
      created++;
    }
    return created;
  },
});

function starterPages(store: string, email: string, days: number) {
  return [
    {
      slug: "about",
      title: "About us",
      kind: "page",
      body: `# Our story\n\n${store} is a small studio making pieces by hand, one at a time.\n\nTell your customers who you are, how you started, and what makes your work special.\n\n## Get in touch\n\nEmail us at ${email}. We usually reply within a day.`,
    },
    {
      slug: "faq",
      title: "FAQ",
      kind: "page",
      body: `# Frequently asked questions\n\n## How do I pay?\nCash on delivery. You pay the courier when your order arrives.\n\n## How long does delivery take?\nMost orders arrive within 2–5 working days. Handmade and custom pieces may take longer; we'll tell you before shipping.\n\n## Can I change or cancel my order?\nYes, before it ships. Contact us with your order number.\n\n## Do you make custom orders?\nTell us what you have in mind at ${email}.`,
    },
    {
      slug: "shipping",
      title: "Shipping policy",
      kind: "policy",
      body: `# Shipping policy\n\n- We deliver across Egypt. The delivery fee for your area is shown at checkout before you order.\n- Ready pieces usually ship within 1–3 working days; custom pieces take longer and we'll confirm timing with you.\n- We call to confirm every order before it ships.\n- Payment is cash on delivery.\n\nQuestions? Email ${email}.`,
    },
    {
      slug: "returns",
      title: "Returns & refunds",
      kind: "policy",
      body: `# Returns & refunds\n\nYou can return a product within **${days} days** of receiving it, in line with Egyptian consumer protection law, as long as it's unused and in its original condition.\n\n## How to return\n1. Go to **Track your order**, enter your order number and phone, and choose **Request a return**. Or email ${email}.\n2. We'll confirm and arrange the pickup.\n3. Once we receive the item, we refund you within 7 days.\n\n## Exceptions\n- Items made to order or personalised for you (custom names, portraits, prints).\n- Items that can't be returned for hygiene reasons once opened.\n\nIf an item arrives damaged or isn't what you ordered, contact us and we'll fix it at no cost to you.\n\n_Review this policy so it matches how you actually work before publishing it._`,
    },
    {
      slug: "privacy",
      title: "Privacy policy",
      kind: "policy",
      body: `# Privacy policy\n\nWe only collect what we need to deliver your order: your name, phone number, delivery address and, if you choose, your email.\n\n- We use it to confirm, deliver and support your order.\n- We share your name, phone and address with the courier who delivers it. Nothing else.\n- We never sell your information.\n- To see or delete your information, email ${email}.\n\n_Review this policy so it matches how you actually work before publishing it._`,
    },
    {
      slug: "terms",
      title: "Terms of service",
      kind: "policy",
      body: `# Terms of service\n\nBy ordering from ${store} you agree to these terms.\n\n- **Prices** are in Egyptian pounds and include any discounts shown at checkout. Delivery is added at checkout.\n- **Handmade pieces** vary slightly from the photos. That's part of their charm.\n- **Orders** are confirmed by phone before shipping. We may cancel an order we can't confirm.\n- **Payment** is cash on delivery.\n- **Returns** follow our Returns & refunds policy.\n\nContact: ${email}\n\n_Review these terms so they match how you actually work before publishing them._`,
    },
  ];
}

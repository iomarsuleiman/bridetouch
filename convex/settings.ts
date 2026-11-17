import { requireAdmin } from "./access";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";

const settingsReturn = v.union(v.null(), v.object({ ...schema.tables.settings.validator.fields, _id: v.id("settings"), _creationTime: v.number() }));

// The storefront only receives public settings, never the administrator roster.
export const get = query({
  args: {},
  returns: settingsReturn,
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    return settings ? { ...settings, adminEmails: [] } : null;
  },
});

export const getForAdmin = query({
  args: {},
  returns: settingsReturn,
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("settings").first();
  },
});

export const update = mutation({
  args: {
    storeName: v.optional(v.string()),
    logoImage: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    supportUrl: v.optional(v.string()),
    socials: v.optional(v.array(v.object({ network: v.string(), url: v.string(), enabled: v.boolean() }))),
    adminEmails: v.optional(v.array(v.string())),
    heroTitle: v.optional(v.string()),
    heroDescription: v.optional(v.string()),
    heroImage: v.optional(v.string()),
    storyTitle: v.optional(v.string()),
    storyDescription: v.optional(v.string()),
    storyImage: v.optional(v.string()),
    catalogTitle: v.optional(v.string()),
    catalogDescription: v.optional(v.string()),
    announcement: v.optional(v.string()),
    navigation: v.optional(v.array(v.string())),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    shipping: v.optional(v.number()),
    freeShipping: v.optional(v.boolean()),
    freeShippingMin: v.optional(v.number()),
    notifications: v.optional(v.boolean()),
    guestCheckout: v.optional(v.boolean()),
  },
  returns: v.union(v.id("settings"), v.null()),
  handler: async (ctx, fields) => {
    await requireAdmin(ctx);
    for (const url of [fields.instagramUrl, fields.supportUrl]) {
      if (url && !/^(https:\/\/|mailto:|tel:)/i.test(url)) throw new Error("Use an HTTPS, email or telephone link");
    }
    if (fields.instagramUrl && new URL(fields.instagramUrl).hostname.replace(/^www\./, "") !== "instagram.com") throw new Error("Use an instagram.com page URL");
    const SOCIAL_HOSTS: Record<string, string[]> = { instagram: ["instagram.com"], facebook: ["facebook.com", "fb.com"], tiktok: ["tiktok.com"] };
    for (const social of fields.socials ?? []) {
      if (!SOCIAL_HOSTS[social.network]) throw new Error("Unknown social network");
      if (!social.url.trim()) continue;
      if (!/^https:\/\//i.test(social.url)) throw new Error("Social links must start with https://");
      const host = new URL(social.url).hostname.replace(/^www\./, "");
      if (!SOCIAL_HOSTS[social.network].some((allowed) => host === allowed || host.endsWith("." + allowed))) throw new Error(`Use a ${social.network} link`);
    }
    if (fields.adminEmails !== undefined) {
      const normalized = [...new Set(fields.adminEmails.map((email) => email.trim().toLowerCase()))];
      if (!normalized.length) throw new Error("Keep at least one administrator");
      if (normalized.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Use valid administrator emails");
      fields.adminEmails = normalized;
    }
    if (fields.shipping !== undefined && (!Number.isFinite(fields.shipping) || fields.shipping < 0)) throw new Error("Delivery fee must be zero or greater");
    if (fields.freeShippingMin !== undefined && (!Number.isFinite(fields.freeShippingMin) || fields.freeShippingMin < 0)) throw new Error("Free delivery threshold must be zero or greater");
    if (fields.adminEmails) {
      const identity = await ctx.auth.getUserIdentity();
      if (!fields.adminEmails.includes(identity?.email?.trim().toLowerCase() ?? "")) throw new Error("Keep your own email in the administrator list");
    }
    const existing = await ctx.db.query("settings").first();
    if (!existing) {
      return await ctx.db.insert("settings", {
        storeName: "bridetouch",
        email: "hello@bridetouch.example",
        city: "Cairo, Egypt",
        shipping: 65,
        freeShipping: true,
        freeShippingMin: 800,
        notifications: true,
        guestCheckout: true,
        ...fields,
      });
    }
    await ctx.db.patch(existing._id, fields);
    return null;
  },
});

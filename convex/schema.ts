import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    number: v.number(), // stable display id, e.g. 1..8
    name: v.string(),
    category: v.string(),
    price: v.number(),
    stock: v.number(),
    description: v.optional(v.string()),
    img: v.optional(v.string()),
    tag: v.optional(v.string()),
    color: v.optional(v.string()),
    // Any number of options (Color, Size, Material…) and one row per
    // combination with its own stock. `values` is aligned with `options`.
    options: v.optional(v.array(v.object({ name: v.string(), values: v.array(v.string()) }))),
    variants: v.optional(v.array(v.object({ values: v.array(v.string()), stock: v.number(), price: v.optional(v.number()) }))),
  }).index("by_number", ["number"]),
  categories: defineTable({
    name: v.string(),
    position: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_position", ["position"]),
  orders: defineTable({
    number: v.number(), // display id, e.g. 1028
    customer: v.string(),
    phone: v.string(),
    date: v.string(),
    placedAt: v.optional(v.number()),
    items: v.array(v.object({ number: v.number(), qty: v.number(), name: v.optional(v.string()), price: v.optional(v.number()), variant: v.optional(v.string()) })),
    subtotal: v.optional(v.number()),
    shippingFee: v.optional(v.number()),
    discount: v.optional(v.number()),
    total: v.number(),
    status: v.string(),
    payment: v.string(),
    delivery: v.string(),
    city: v.string(),
    address: v.string(),
    notes: v.optional(v.string()),
    userId: v.optional(v.string()),
  })
    .index("by_number", ["number"])
    .index("by_user", ["userId"]),
  coupons: defineTable({
    code: v.string(),
    type: v.string(), // "Percentage" | "Fixed amount"
    value: v.number(),
    uses: v.number(),
    active: v.boolean(),
  }).index("by_code", ["code"]),
  offers: defineTable({
    name: v.string(),
    kind: v.string(),
    details: v.string(),
    active: v.boolean(),
  }),
  // Timed sales: a percentage discount that applies automatically during
  // [startsAt, endsAt] (epoch ms). Scope narrows it to chosen products or
  // collections; omitted scope means the whole store.
  sales: defineTable({
    name: v.string(),
    percentOff: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    active: v.boolean(),
    scope: v.optional(v.string()), // "all" | "products" | "collections"
    productNumbers: v.optional(v.array(v.number())),
    collectionNames: v.optional(v.array(v.string())),
  }),
  // Audit trail for store changes (currently sales and categories).
  activity: defineTable({
    at: v.number(),
    kind: v.string(),
    message: v.string(),
    actor: v.optional(v.string()),
  }).index("by_at", ["at"]),
  collections: defineTable({
    name: v.string(),
    image: v.string(),
    count: v.number(),
    productNumbers: v.optional(v.array(v.number())),
  }),
  pushSubscriptions: defineTable({userId:v.string(),email:v.optional(v.string()), endpoint:v.string(), expirationTime:v.union(v.number(),v.null()), keys:v.object({p256dh:v.string(),auth:v.string()})}).index("by_endpoint",["endpoint"]).index("by_user",["userId"]),
  settings: defineTable({
    storeName: v.string(),
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
    email: v.string(),
    city: v.string(),
    shipping: v.number(),
    freeShipping: v.boolean(),
    freeShippingMin: v.optional(v.number()),
    notifications: v.boolean(),
    guestCheckout: v.boolean(),
    // Highest product number ever issued, so a deleted product's number (and
    // its old links) is never reused for a different product.
    lastProductNumber: v.optional(v.number()),
  }),
});

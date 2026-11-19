import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => vi.stubEnv("BRIDETOUCH_ADMIN_EMAILS", "owner@example.com"));
afterEach(() => vi.unstubAllEnvs());

const buyer = { customer: "Mona", phone: "01012345678", city: "Cairo", address: "12 Street", items: [{ number: 1, qty: 1 }] };

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.maintenance.initialize, {});
  await t.run(async (ctx) => {
    await ctx.db.insert("products", { number: 1, name: "Veil", category: "Bridal", price: 500, stock: 10 });
    await ctx.db.insert("products", { number: 2, name: "Secret tiara", category: "Bridal", price: 900, stock: 5, status: "draft" });
  });
  return { t, admin: t.withIdentity({ subject: "owner", email: "owner@example.com" }) };
}

test("draft products are hidden from shoppers and can't be bought", async () => {
  const { t, admin } = await setup();
  expect((await t.query(api.products.list, {})).map((p) => p.name)).toEqual(["Veil"]);
  expect(await t.query(api.products.getByNumber, { number: 2 })).toBeNull();
  expect((await admin.query(api.products.getByNumber, { number: 2 }))?.name).toBe("Secret tiara");
  expect(await admin.query(api.products.listAll, {})).toHaveLength(2);
  await expect(t.query(api.products.listAll, {})).rejects.toThrow("Administrator");
  await expect(t.mutation(api.orders.createCheckout, { ...buyer, items: [{ number: 2, qty: 1 }] })).rejects.toThrow("no longer available");
  const tiara = (await admin.query(api.products.listAll, {})).find((p) => p.number === 2)!;
  await admin.mutation(api.products.setStatus, { id: tiara._id, status: "active" });
  expect(await t.query(api.products.list, {})).toHaveLength(2);
});

test("products keep a gallery, SKU and compare-at price", async () => {
  const { admin } = await setup();
  const id = await admin.mutation(api.products.add, {
    name: "Hair pin", category: "Bridal", price: 200, stock: 3, img: "https://img.example/a.jpg",
    images: ["https://img.example/b.jpg", "https://img.example/b.jpg", " "], sku: " PIN-01 ", compareAtPrice: 260, status: "draft",
  });
  const saved = (await admin.query(api.products.listAll, {})).find((p) => p._id === id)!;
  expect(saved.images).toEqual(["https://img.example/b.jpg"]);
  expect(saved.sku).toBe("PIN-01");
  expect(saved.compareAtPrice).toBe(260);
  expect(saved.status).toBe("draft");
  await expect(admin.mutation(api.products.add, { name: "x", category: "y", price: 1, stock: 1, images: ["javascript:alert(1)"] })).rejects.toThrow("https://");
});

test("delivery zones set the fee and must be chosen", async () => {
  const { t, admin } = await setup();
  await admin.mutation(api.settings.update, {
    freeShipping: false,
    zones: [{ name: "Cairo", fee: 50, eta: "1–2 days", enabled: true }, { name: "Aswan", fee: 120, enabled: true }, { name: "Closed", fee: 1, enabled: false }],
  });
  await expect(t.mutation(api.orders.createCheckout, buyer)).rejects.toThrow("delivery area");
  await expect(t.mutation(api.orders.createCheckout, { ...buyer, zone: "Closed" })).rejects.toThrow("delivery area");
  const order = await t.mutation(api.orders.createCheckout, { ...buyer, zone: "Aswan", email: "Mona@Example.com" });
  expect(order?.shippingFee).toBe(120);
  expect(order?.total).toBe(620);
  expect(order?.zone).toBe("Aswan");
  expect(order?.email).toBe("mona@example.com");
  await expect(admin.mutation(api.settings.update, { zones: [{ name: "A", fee: -1, enabled: true }] })).rejects.toThrow("zero or more");
});

test("checkout blocks bots and repeated fake orders", async () => {
  const { t } = await setup();
  await expect(t.mutation(api.orders.createCheckout, { ...buyer, website: "http://spam" })).rejects.toThrow();
  await t.mutation(api.orders.createCheckout, buyer);
  await t.mutation(api.orders.createCheckout, buyer);
  await t.mutation(api.orders.createCheckout, buyer);
  await expect(t.mutation(api.orders.createCheckout, buyer)).rejects.toThrow("several orders");
  await t.mutation(api.orders.createCheckout, { ...buyer, phone: "01112345678" });
  await expect(t.mutation(api.orders.createCheckout, { ...buyer, phone: "01212345678", email: "nope" })).rejects.toThrow("valid email");
});

test("customers can look up their order and request a return after delivery", async () => {
  const { t, admin } = await setup();
  const order = (await t.mutation(api.orders.createCheckout, buyer))!;
  expect(await t.query(api.orders.lookup, { number: order.number, phone: "01099999999" })).toBeNull();
  const found = await t.query(api.orders.lookup, { number: order.number, phone: "+20 101 234 5678" });
  expect(found?.status).toBe("New");
  expect(found?.canRequestReturn).toBe(false);
  expect(Object.keys(found!)).not.toContain("address");
  await expect(t.mutation(api.orders.requestReturn, { number: order.number, phone: buyer.phone, reason: "Wrong size" })).rejects.toThrow("can't be returned");

  await admin.mutation(api.orders.updateStatus, { id: order._id, status: "Delivered" });
  await admin.mutation(api.orders.setTracking, { id: order._id, carrier: "Bosta", number: "BX123", url: "https://bosta.co/t/BX123" });
  const delivered = await t.query(api.orders.lookup, { number: order.number, phone: buyer.phone });
  expect(delivered?.canRequestReturn).toBe(true);
  expect(delivered?.tracking?.number).toBe("BX123");
  await t.mutation(api.orders.requestReturn, { number: order.number, phone: buyer.phone, reason: "Wrong size" });
  await expect(t.mutation(api.orders.requestReturn, { number: order.number, phone: buyer.phone, reason: "Again" })).rejects.toThrow("already");
  await admin.mutation(api.orders.updateReturn, { id: order._id, status: "Refunded", note: "Refunded in cash" });
  expect((await t.query(api.orders.lookup, { number: order.number, phone: buyer.phone }))?.returnRequest?.status).toBe("Refunded");
  await expect(t.mutation(api.orders.updateReturn, { id: order._id, status: "Refunded" })).rejects.toThrow("Administrator");
});

test("pages: starter drafts, publishing, reserved addresses", async () => {
  const { t, admin } = await setup();
  expect(await admin.mutation(api.pages.createStarterPages, {})).toBe(6);
  expect(await admin.mutation(api.pages.createStarterPages, {})).toBe(0);
  expect(await t.query(api.pages.listPublished, {})).toEqual([]);
  expect(await t.query(api.pages.getBySlug, { slug: "returns" })).toBeNull();
  const returns = await admin.query(api.pages.getBySlug, { slug: "returns" });
  expect(returns?.body).toContain("14 days");
  await admin.mutation(api.pages.save, { id: returns!._id, title: returns!.title, slug: "returns", body: returns!.body, published: true, kind: "policy" });
  expect(await t.query(api.pages.listPublished, {})).toEqual([{ slug: "returns", title: "Returns & refunds", kind: "policy" }]);
  await expect(admin.mutation(api.pages.save, { title: "Admin", body: "x", published: true })).rejects.toThrow("reserved");
  await expect(admin.mutation(api.pages.save, { title: "FAQ", body: "x", published: true })).rejects.toThrow("already uses");
  await expect(t.mutation(api.pages.save, { title: "Hack", body: "x", published: true })).rejects.toThrow("Administrator");
});

test("menu links are validated", async () => {
  const { admin } = await setup();
  await admin.mutation(api.settings.update, { navLinks: [{ label: "Bridal", type: "category", target: "Bridal" }, { label: "Instagram", type: "url", target: "https://instagram.com/x" }] });
  await expect(admin.mutation(api.settings.update, { navLinks: [{ label: "Bad", type: "url", target: "javascript:alert(1)" }] })).rejects.toThrow("https://");
  await expect(admin.mutation(api.settings.update, { navLinks: [{ label: "Empty", type: "category" }] })).rejects.toThrow("Choose where");
  await expect(admin.mutation(api.settings.update, { returnDays: 7 })).rejects.toThrow("14 days");
});

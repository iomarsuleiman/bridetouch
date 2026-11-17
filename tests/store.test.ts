import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { SEED_PRODUCTS, SEED_ORDERS } from "../convex/seedSignatures";
import { orderMetrics } from "../src/admin/metrics";
const modules = import.meta.glob("../convex/**/*.ts");
beforeEach(() => vi.stubEnv("BRIDETOUCH_ADMIN_EMAILS", "owner@example.com"));
afterEach(() => vi.unstubAllEnvs());
const customer = {customer:"Store test",phone:"01012345678",city:"Cairo",address:"Test address",items:[{number:1,qty:1}]};
async function setup() {
 const t=convexTest(schema,modules);await t.mutation(internal.maintenance.initialize,{});
 await t.run(async ctx=>{await ctx.db.insert("products",{number:1,name:"Real piece",category:"Gifts",price:100,stock:3});});
 return t;
}
test("private orders and admin writes require sign in; email restrictions apply",async()=>{
 const t=await setup();await expect(t.query(api.orders.list,{})).rejects.toThrow("Administrator");
 await expect(t.mutation(api.products.add,{name:"x",category:"x",price:1,stock:1})).rejects.toThrow("Administrator");
 const owner=t.withIdentity({subject:"owner",email:"owner@example.com"});
 const outsider=t.withIdentity({subject:"other",email:"other@example.com"});
 expect(await owner.query(api.access.current,{})).toBe(true);
 expect(await outsider.query(api.access.current,{})).toBe(false);
 await expect(outsider.mutation(api.settings.update,{shipping:0})).rejects.toThrow("Administrator");
 expect(await owner.query(api.access.roster,{})).toEqual(["owner@example.com"]);
 await owner.mutation(api.settings.update,{adminEmails:["owner@example.com","admin@example.com"]});
 expect(await owner.query(api.access.roster,{})).toEqual(["owner@example.com","admin@example.com"]);
 const publicSettings=await t.query(api.settings.get,{});
 expect(publicSettings?.adminEmails).toEqual([]);
 await expect(outsider.query(api.settings.getForAdmin,{})).rejects.toThrow("Administrator");
 await expect(owner.mutation(api.settings.update,{adminEmails:[]})).rejects.toThrow("least one administrator");
 await expect(owner.mutation(api.settings.update,{adminEmails:["admin@example.com"]})).rejects.toThrow("Keep your own");
 expect(await outsider.query(api.access.current,{})).toBe(false);
});
test("checkout validates quantities, aggregates duplicates, snapshots prices, and decrements stock",async()=>{
 vi.useFakeTimers();
 try {
 const t=await setup();
 for (const qty of [0,-1,1.5]) await expect(t.mutation(api.orders.createCheckout,{...customer,items:[{number:1,qty}]})).rejects.toThrow("quantity");
 await expect(t.mutation(api.orders.createCheckout,{...customer,items:[]})).rejects.toThrow("bag");
 await expect(t.mutation(api.orders.createCheckout,{...customer,items:[{number:1,qty:2},{number:1,qty:2}]})).rejects.toThrow("Only 3");
 const order=await t.mutation(api.orders.createCheckout,{...customer,items:[{number:1,qty:1},{number:1,qty:1}],userId:"spoofed"});
 expect(order?.items).toEqual([{number:1,qty:2,name:"Real piece",price:100}]);expect(order?.total).toBe(265);expect(order?.userId).toBeUndefined();
 expect((await t.query(api.products.getByNumber,{number:1}))?.stock).toBe(1);
 await t.finishAllScheduledFunctions(()=>vi.runAllTimers());
 } finally {vi.useRealTimers();}
});
test("cleanup removes seed signatures, preserves real orders and is idempotent",async()=>{
 const t=await setup();
 await t.run(async ctx=>{await ctx.db.insert("products",SEED_PRODUCTS[1]);await ctx.db.insert("orders",SEED_ORDERS[0]);await ctx.db.insert("orders",{...SEED_ORDERS[0],number:2000,customer:"Actual customer"});});
 const dry=await t.mutation(internal.maintenance.removeSeeds,{apply:false});expect(dry.find(x=>x.table==="products")?.matched).toBe(1);
 await t.mutation(internal.maintenance.removeSeeds,{apply:true});
 const remaining=await t.withIdentity({subject:"owner",email:"owner@example.com"}).query(api.orders.list,{});expect(remaining).toHaveLength(1);expect(remaining[0].customer).toBe("Actual customer");
 expect((await t.mutation(internal.maintenance.removeSeeds,{apply:true})).every(x=>x.matched===0)).toBe(true);
 expect(await t.query(api.products.list,{})).toHaveLength(1);
});
test("empty analytics contains only zero values, no NaN",()=>{
 const metrics=orderMetrics([],"Last 7 days");expect(metrics.average).toBe(0);expect(metrics.total).toBe(0);expect(metrics.days).toHaveLength(7);expect(metrics.days.every(day=>day.count===0&&day.total===0)).toBe(true);
});
test("support links reject unsafe schemes",async()=>{
 const owner=(await setup()).withIdentity({subject:"owner",email:"owner@example.com"});
 await expect(owner.mutation(api.settings.update,{supportUrl:"javascript:alert(1)"})).rejects.toThrow("link");
 await owner.mutation(api.settings.update,{instagramUrl:"https://www.instagram.com/bridetouch",supportUrl:"mailto:support@example.com"});
});

test("configured free-delivery threshold is enforced in recorded orders",async()=>{
 const t=await setup();
 const admin=t.withIdentity({subject:"owner",email:"owner@example.com"});
 await admin.mutation(api.settings.update,{shipping:25,freeShipping:true,freeShippingMin:150});
 const below=await t.mutation(api.orders.createCheckout,{...customer});
 expect(below?.shippingFee).toBe(25);expect(below?.total).toBe(125);
 const atOrAbove=await t.mutation(api.orders.createCheckout,{...customer,items:[{number:1,qty:2}]});
 expect(atOrAbove?.shippingFee).toBe(0);expect(atOrAbove?.total).toBe(200);
 await admin.mutation(api.settings.update,{freeShippingMin:0,freeShipping:false});
 await t.run(async ctx=>{const p=await ctx.db.query("products").withIndex("by_number",q=>q.eq("number",1)).first();if(p)await ctx.db.patch(p._id,{stock:1});});
 const disabled=await t.mutation(api.orders.createCheckout,{...customer});
 expect(disabled?.shippingFee).toBe(25);expect(disabled?.total).toBe(125);
 await expect(admin.mutation(api.settings.update,{freeShippingMin:-1})).rejects.toThrow("threshold");
});


test("variant inventory, unit prices and order snapshots survive checkout", async () => {
  vi.useFakeTimers();
  try {
    const t = await setup();
    const admin = t.withIdentity({ subject: "owner", email: "owner@example.com" });
    await admin.mutation(api.products.add, {
      name: "Custom necklace", category: "Jewelry", price: 250, stock: 7,
      options: [
        { name: "Finish", values: ["Gold", "Silver"] },
        { name: "Size", values: ["Small", "Large"] },
      ],
      variants: [
        { values: ["Gold", "Small"], stock: 2, price: 270 },
        { values: ["Gold", "Large"], stock: 1, price: 280 },
        { values: ["Silver", "Small"], stock: 3 },
        { values: ["Silver", "Large"], stock: 1 },
      ],
    });
    const created = (await t.query(api.products.list, {})).find((entry) => entry.name === "Custom necklace");
    expect(created?.stock).toBe(7);
    expect(created?.options).toHaveLength(2);
    const placed = await t.mutation(api.orders.createCheckout, {
      ...customer,
      items: [{ number: created!.number, qty: 2, variant: ["Gold", "Small"] }],
    });
    expect(placed?.subtotal).toBe(540);
    expect(placed?.items[0]).toMatchObject({ price: 270, variant: "Finish: Gold · Size: Small", qty: 2 });
    const product = await t.query(api.products.getByNumber, { number: created!.number });
    expect(product?.stock).toBe(5);
    expect(product?.variants?.find((entry) => entry.values.join("/") === "Gold/Small")?.stock).toBe(0);
    expect(product?.variants?.find((entry) => entry.values.join("/") === "Silver/Small")?.stock).toBe(3);
    await expect(t.mutation(api.orders.createCheckout, {
      ...customer, items: [{ number: created!.number, qty: 1, variant: ["Gold", "Small"] }],
    })).rejects.toThrow("Only 0");
    await expect(t.mutation(api.orders.createCheckout, {
      ...customer, items: [{ number: created!.number, qty: 1 }],
    })).rejects.toThrow("Choose valid options");
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  } finally {
    vi.useRealTimers();
  }
});

test("timed sales apply only to selected products or collections", async () => {
  vi.useFakeTimers();
  try {
    const t = await setup();
    const admin = t.withIdentity({ subject: "owner", email: "owner@example.com" });
    await admin.mutation(api.products.add, { name: "Rings", category: "Accessories", price: 200, stock: 10 });
    const rings = (await t.query(api.products.list, {})).find((product) => product.name === "Rings")!;
    const now = Date.now();
    await admin.mutation(api.sales.add, {
      name: "Rings only", percentOff: 50, startsAt: now - 10_000, endsAt: now + 10_000,
      scope: "products", productNumbers: [rings.number],
    });
    const order = await t.mutation(api.orders.createCheckout, {
      ...customer, items: [{ number: 1, qty: 1 }, { number: rings.number, qty: 1 }],
    });
    expect(order?.subtotal).toBe(300);
    expect(order?.discount).toBe(100); // 50% of rings, not of both lines
    await admin.mutation(api.collections.add, {
      name: "Gifts", image: "", productNumbers: [1],
    });
    await admin.mutation(api.sales.add, {
      name: "Gifts only", percentOff: 25, startsAt: now - 10_000, endsAt: now + 10_000,
      scope: "collections", collectionNames: ["Gifts"],
    });
    const nextOrder = await t.mutation(api.orders.createCheckout, {
      ...customer, items: [{ number: 1, qty: 1 }, { number: rings.number, qty: 1 }],
    });
    expect(nextOrder?.discount).toBe(125); // 25% on #1, 50% on rings, without stacking
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  } finally {
    vi.useRealTimers();
  }
});

test("new products create reusable category records", async () => {
  const t = await setup();
  const admin = t.withIdentity({ subject: "owner", email: "owner@example.com" });
  await admin.mutation(api.products.add, { name: "Custom ring", category: "Accessories", price: 100, stock: 2 });
  const categories = await t.query(api.categories.list, {});
  expect(categories.map((category) => category.name)).toContain("Accessories");
  await admin.mutation(api.products.add, { name: "Other ring", category: "Accessories", price: 150, stock: 1 });
  expect((await t.query(api.categories.list, {})).filter((category) => category.name === "Accessories")).toHaveLength(1);
});

import { expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { SEED_PRODUCTS, SEED_ORDERS } from "../convex/seedSignatures";
import { orderMetrics } from "../src/admin/metrics";
const modules = import.meta.glob("../convex/**/*.ts");
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
 expect(await owner.query(api.access.current,{})).toBe(true);
 await owner.mutation(api.settings.update,{adminEmails:["owner@example.com"]});
 expect(await t.withIdentity({subject:"other",email:"other@example.com"}).query(api.access.current,{})).toBe(false);
 await expect(t.withIdentity({subject:"other",email:"other@example.com"}).mutation(api.settings.update,{shipping:0})).rejects.toThrow("Administrator");
 await owner.mutation(api.settings.update,{adminEmails:[]});
 expect(await t.withIdentity({subject:"other",email:"other@example.com"}).query(api.access.current,{})).toBe(true);
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
 const remaining=await t.withIdentity({subject:"owner"}).query(api.orders.list,{});expect(remaining).toHaveLength(1);expect(remaining[0].customer).toBe("Actual customer");
 expect((await t.mutation(internal.maintenance.removeSeeds,{apply:true})).every(x=>x.matched===0)).toBe(true);
 expect(await t.query(api.products.list,{})).toHaveLength(1);
});
test("empty analytics contains only zero values, no NaN",()=>{
 const metrics=orderMetrics([],"Last 7 days");expect(metrics.average).toBe(0);expect(metrics.total).toBe(0);expect(metrics.days).toHaveLength(7);expect(metrics.days.every(day=>day.count===0&&day.total===0)).toBe(true);
});
test("support links reject unsafe schemes",async()=>{
 const owner=(await setup()).withIdentity({subject:"owner"});
 await expect(owner.mutation(api.settings.update,{supportUrl:"javascript:alert(1)"})).rejects.toThrow("link");
 await owner.mutation(api.settings.update,{instagramUrl:"https://www.instagram.com/bridetouch",supportUrl:"mailto:support@example.com"});
});

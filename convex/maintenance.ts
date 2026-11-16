import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { SEED_PRODUCTS, SEED_ORDERS, SEED_COUPONS, SEED_OFFERS, SEED_COLLECTIONS } from "./seedSignatures";
const match = (row: Record<string,unknown>, seed: Record<string,unknown>, keys:string[]) => keys.every(key=>JSON.stringify(row[key]) === JSON.stringify(seed[key]));
export const removeSeeds = internalMutation({args:{apply:v.boolean()},returns:v.array(v.object({table:v.string(),matched:v.number(),remaining:v.number()})),handler:async(ctx,{apply})=>{
  const report = [];
  const products = await ctx.db.query("products").take(5000);
  const orders = await ctx.db.query("orders").take(5000);
  const coupons = await ctx.db.query("coupons").take(5000);
  const offers = await ctx.db.query("offers").take(5000);
  const collections = await ctx.db.query("collections").take(5000);
  const sales = await ctx.db.query("sales").take(5000);
  const groups = [
    {table:"products",all:products,rows:products.filter(row=>SEED_PRODUCTS.some(seed=>match(row,seed,["number","name","price","description"])))},
    {table:"orders",all:orders,rows:orders.filter(row=>SEED_ORDERS.some(seed=>match(row,seed,["number","customer","phone","address","total"])))},
    {table:"coupons",all:coupons,rows:coupons.filter(row=>SEED_COUPONS.some(seed=>match(row,seed,["code","type","value"])))},
    {table:"offers",all:offers,rows:offers.filter(row=>SEED_OFFERS.some(seed=>match(row,seed,["name","kind","details"])))},
    {table:"collections",all:collections,rows:collections.filter(row=>!row.productNumbers && SEED_COLLECTIONS.some(seed=>match(row,seed,["name","image"])))},
    {table:"sales",all:sales,rows:sales.filter(row=>(row.name === "Weekend flash \u2014 15% off" && row.percentOff === 15)||(row.name === "Winter preview \u2014 25% off" && row.percentOff === 25))}
  ];
  // Preserve historical names/prices for any real orders referencing sample products.
  if (apply) {
    const deleted = new Set(groups[1].rows.map(row=>row._id));
    for (const order of orders) if (!deleted.has(order._id)) await ctx.db.patch(order._id,{items:order.items.map(item=>{
      const product = products.find(product=>product.number === item.number);
      return {...item, name:item.name ?? product?.name ?? "Item",price:item.price ?? product?.price ?? 0};
    })});
  }
  for (const group of groups) {
    if (apply) for (const row of group.rows) await ctx.db.delete(row._id);
    report.push({table:group.table,matched:group.rows.length,remaining:group.all.length-group.rows.length});
  }
  return report;
}});
export const initialize = internalMutation({args:{},returns:v.null(),handler:async ctx=>{
  const existing = await ctx.db.query("settings").first();
  if (!existing) await ctx.db.insert("settings",{storeName:"bridetouch",email:"omaarsuliiman@gmail.com",city:"Cairo, Egypt",shipping:65,freeShipping:true,notifications:true,guestCheckout:true,adminEmails:[],navigation:[]});
  else {
    const patch:{email?:string;navigation?:string[];adminEmails?:string[]} = {};
    if (!existing.email || existing.email.endsWith(".example")) patch.email = "omaarsuliiman@gmail.com";
    if (!existing.adminEmails) patch.adminEmails = [];
    if (!existing.navigation) patch.navigation = [];
    await ctx.db.patch(existing._id,patch);
  }
  return null;
}});

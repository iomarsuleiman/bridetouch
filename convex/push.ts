import schema from "./schema";
import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAdmin, isAdmin } from "./access";
const subscriptionFields = {endpoint:v.string(),expirationTime:v.union(v.number(),v.null()),keys:v.object({p256dh:v.string(),auth:v.string()})};
const document = v.object({...schema.tables.pushSubscriptions.validator.fields,_id:v.id("pushSubscriptions"),_creationTime:v.number()});
export const configuration = query({args:{},returns:v.union(v.string(),v.null()),handler:async ctx => {
  if (!await isAdmin(ctx)) return null;
  return process.env.VAPID_PUBLIC_KEY ?? null;
}});
export const subscribe = mutation({args:subscriptionFields,returns:v.null(),handler:async(ctx,args)=>{
  await requireAdmin(ctx);
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to enable notifications");
  const url = new URL(args.endpoint);
  const allowed = ["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"];
  if (url.protocol !== "https:" || !allowed.some(host=>url.hostname === host || url.hostname.endsWith("."+host))) throw new Error("Unsupported push endpoint");
  const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint",q=>q.eq("endpoint",args.endpoint)).first();
  if (existing && existing.userId !== identity.subject) throw new Error("This device is subscribed to a different account");
  if (existing) await ctx.db.patch(existing._id,{...args,email:identity.email});
  else await ctx.db.insert("pushSubscriptions",{...args,userId:identity.subject,email:identity.email});
  return null;
}});
export const unsubscribe = mutation({args:{endpoint:v.string()},returns:v.null(),handler:async(ctx,args)=>{
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in required");
  const existing = await ctx.db.query("pushSubscriptions").withIndex("by_endpoint",q=>q.eq("endpoint",args.endpoint)).first();
  if (existing?.userId === identity.subject) await ctx.db.delete(existing._id);
  return null;
}});
export const recipients = internalQuery({args:{},returns: v.array(document),
  handler:async ctx=>{
  const settings = await ctx.db.query("settings").first();
  if (!settings?.notifications) return [];
  const subscriptions = await ctx.db.query("pushSubscriptions").take(1000);
  return subscriptions.filter(subscription=>!settings.adminEmails?.length || settings.adminEmails.some(email=>email.toLowerCase() === subscription.email?.toLowerCase()));
}});
export const removeExpired = internalMutation({args:{id:v.id("pushSubscriptions")},returns:v.null(),handler:async(ctx,{id})=>{await ctx.db.delete(id);return null;}});

"use node";
import * as webpush from "web-push";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
export const sendNewOrder = internalAction({args:{number:v.number()},returns:v.null(),handler:async(ctx,{number})=>{
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:omaarsuliiman@gmail.com",publicKey,privateKey);
  const subscriptions = await ctx.runQuery(internal.push.recipients,{});
  await Promise.all(subscriptions.map(async subscription=>{
    try {await webpush.sendNotification(subscription,JSON.stringify({title:"New order",body:`Order #ML-${number} is ready to review.`,url:"/admin/orders"}),{TTL:3600});}
    catch(error) {
      if (error instanceof webpush.WebPushError && [404,410].includes(error.statusCode)) await ctx.runMutation(internal.push.removeExpired,{id:subscription._id});
      else console.error("Push delivery failed",error instanceof Error ? error.message : "Unknown error");
    }
  }));
  return null;
}});

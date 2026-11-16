import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
export async function isAdmin(ctx: Pick<QueryCtx, "auth" | "db">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const settings = await ctx.db.query("settings").first();
  const emails = settings?.adminEmails ?? [];
  if (!emails.length) return true;
  return !!identity.email && emails.some(email => email.trim().toLowerCase() === identity.email?.toLowerCase());
}
export async function requireAdmin(ctx: Pick<QueryCtx, "auth" | "db">) {
  if (!await isAdmin(ctx)) throw new Error("Administrator access required");
}
export const current = query({args:{}, returns:v.boolean(), handler: isAdmin});

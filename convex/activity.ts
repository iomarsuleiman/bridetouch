import { requireAdmin } from "./access";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Writes an audit entry. Called from admin mutations so every sale/category
// change leaves a visible trail in the dashboard.
export async function logActivity(ctx: MutationCtx, kind: string, message: string) {
  const identity = await ctx.auth.getUserIdentity();
  await ctx.db.insert("activity", {
    at: Date.now(),
    kind,
    message,
    actor: identity?.email ?? undefined,
  });
}

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("activity"),
      _creationTime: v.number(),
      at: v.number(),
      kind: v.string(),
      message: v.string(),
      actor: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("activity").withIndex("by_at").order("desc").take(40);
  },
});

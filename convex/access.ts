import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/**
 * The initial owners are explicitly configured in the Convex deployment.
 * No signed-in stranger may bootstrap themselves as an administrator.
 * Once the dashboard has a saved roster, that list takes precedence.
 */
function initialAdminEmails(): string[] {
  return (process.env.BRIDETOUCH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function adminRoster(ctx: Pick<QueryCtx, "db">): Promise<string[]> {
  const settings = await ctx.db.query("settings").first();
  const configured = settings?.adminEmails?.length ? settings.adminEmails : initialAdminEmails();
  return [...new Set(configured.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export async function isAdmin(ctx: Pick<QueryCtx, "auth" | "db">) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.trim().toLowerCase();
  if (!email) return false;
  // Fail closed: no explicit administrator emails means no dashboard access.
  return (await adminRoster(ctx)).includes(email);
}

export async function requireAdmin(ctx: Pick<QueryCtx, "auth" | "db">) {
  if (!(await isAdmin(ctx))) throw new Error("Administrator access required");
}

export const current = query({ args: {}, returns: v.boolean(), handler: isAdmin });
export const roster = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return adminRoster(ctx);
  },
});

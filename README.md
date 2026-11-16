# bridetouch

React + Vite storefront and dashboard, backed by Convex and Clerk, hosted on Cloudflare Workers.

## Development

1. Copy `.env.example` to `.env.local` and fill in the public frontend configuration.
2. Run `npm ci`, then `npx convex dev` and `npm run dev`.
3. Open `/` for the store or `/admin` for the dashboard.

Instagram, support, branding, homepage copy, navigation and administrator email restrictions are edited in **Admin > Settings**. An empty administrator list permits all signed-in users, as requested. Add emails to restrict access. Anonymous users cannot read orders or write admin data.

## Verification

`npm run typecheck`, `npm test`, and `npm run build`.

Tests cover authorization, restrictions, stock validation, immutable receipt prices, seed cleanup, uploads, PWA notification handling, and empty analytics.

## Deployment

Deploy backend functions with `npx convex deploy --yes`. Build the frontend with the production `VITE_CONVEX_URL`, then use `npm run deploy`. The root Worker serves `dist/` with SPA routes; `api/wrangler.jsonc` configures the separate image upload Worker.

For Clerk, configure a `convex` JWT template with audience `convex`. Set `CLERK_ISSUER_DOMAIN` on each Convex deployment. The frontend publishable key and backend issuer must refer to the same Clerk instance. Switch both to a production Clerk instance when its credentials are available.

For uploads, deploy `npx wrangler deploy -c api/wrangler.jsonc`. `CONVEX_URL` targets production, `DEV_CONVEX_URL` targets localhost development, and `ALLOWED_ORIGINS` lists permitted frontend origins. The Worker verifies Clerk tokens and the backend admin access policy.

## PWA and notifications

The manifest and service worker allow installation and handle background push. Signed-in administrators can enable notifications in Settings or Notifications. Permission is requested only after tapping Enable. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` on each backend. New checkout orders schedule a server-side push; expired subscriptions are removed. On iPhone, install to the Home Screen first. No private pages or API responses are cached offline.

## Seed cleanup

Back up with `npx convex export --path .backups/dev.zip` or add `--prod` for production. Run `node scripts/cleanup-seeds.mjs` for a dry run, then add `--apply` to remove only matching original seed records. Add `--prod` to target production. Cleanup is idempotent and preserves nonseed orders, including their historical product names and prices. No seeds run on startup. Backups and environment secrets are ignored by git.

# bridetouch

React + Vite storefront and dashboard, backed by Convex and Clerk, hosted on Cloudflare Workers.

## Development

1. Copy `.env.example` to `.env.local` and fill in the public frontend configuration.
2. Run `npm ci`, then `npx convex dev` and `npm run dev`.
3. Open `/` for the store or `/admin` for the dashboard.

Instagram, support, branding, homepage copy, ordered header navigation and the administrator allowlist are edited in **Admin > Settings**. Social links can appear in the storefront header and footer. Administrator access is denied unless the signed-in Clerk email is explicitly allowed. Anonymous users and unlisted signed-in users cannot read orders or write admin data.

### First administrator (required before enabling fail-closed access)

Before deploying the new authorization functions, configure the real store-owner email(s) on the **production Convex deployment**, for example:

```sh
npx convex env set BRIDETOUCH_ADMIN_EMAILS "owner@example.com" --prod
```

Replace the placeholder with the verified email address used to sign in via Clerk. Multiple known owners can be separated by commas. This environment variable is used only until an existing administrator saves an explicit, nonempty roster in Settings. Once saved, the database roster takes precedence. An empty database roster with no configured owner email denies all dashboard access — **never deploy without establishing the owner first**. The public settings query intentionally hides administrator addresses; the private dashboard reads the effective roster. Adding a Clerk account by itself never grants dashboard access.

Clerk sign-up availability is configured separately in the Clerk dashboard; disable public sign-ups or require invitations there if you also want to prevent creation of any new Clerk accounts (not merely prevent admin access).

## Verification

`npm run typecheck`, `npm test`, and `npm run build`.

Tests cover authorization, restrictions, stock validation, immutable receipt prices, seed cleanup, uploads, PWA notification handling, and empty analytics.

## Deployment (Vercel + Convex, uploads on Cloudflare)

The site is hosted on **Vercel**. Every push to `main` deploys production; pull requests get preview URLs.

`vercel.json` + `scripts/vercel-build.mjs` handle the rest:

- **Production builds deploy the Convex backend first** (`npx convex deploy`), then build the site against it, so frontend and backend never drift. This needs `CONVEX_DEPLOY_KEY` in Vercel.
- `api/seo.js` (a Vercel Function) serves each storefront page with its own title, description, social preview and product data, returns real 404s, and serves `/robots.txt` and a live `/sitemap.xml`.

**Vercel → Project → Settings → Environment Variables**

| Name | Value | Environments |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Convex dashboard → production deployment → Settings → Deploy key | Production |
| `VITE_CONVEX_URL` | `https://resilient-snake-473.eu-west-1.convex.cloud` | Production, Preview |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Production, Preview |
| `VITE_IMAGE_API_URL` | `https://melo-image-api.omaarsuliiman.workers.dev` | Production, Preview |

For Clerk, configure a `convex` JWT template with audience `convex`. Set `CLERK_ISSUER_DOMAIN` on each Convex deployment. The frontend publishable key and backend issuer must refer to the same Clerk instance. Switch both to a production Clerk instance when its credentials are available, and add your Vercel domain to the Clerk instance's allowed origins.

**Image uploads** stay on the Cloudflare Worker + R2 in `api/` (ignored by Vercel via `.vercelignore`). Deploy it with `npx wrangler deploy -c api/wrangler.jsonc`. `ALLOWED_ORIGINS` lists the sites allowed to upload; it accepts `*` for one name segment, e.g. `https://bridetouch-*-wareedio.vercel.app` for preview deployments. Add your custom domain there when you have one. `CONVEX_URL` targets production and `DEV_CONVEX_URL` localhost development; the Worker verifies Clerk tokens and the backend admin access policy.

The older Cloudflare hosting files (`worker.js`, `wrangler.jsonc`) are kept but no longer used for hosting.

## PWA and notifications

The manifest and service worker allow installation and handle background push. Signed-in administrators can enable notifications in Settings or Notifications. Permission is requested only after tapping Enable. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` on each backend. New checkout orders schedule a server-side push; expired subscriptions are removed. On iPhone, install to the Home Screen first. No private pages or API responses are cached offline.

## Start fresh (wipe all store data)

Removes every order, product, category, collection, discount code, offer, sale and activity entry. Settings (store name, admin emails, delivery fees) are kept, so administrators keep access. Back up first:

```sh
npx convex export --prod --path .backups/before-wipe.zip
npx convex run maintenance:wipeStoreData --prod                                   # dry run: shows what would be deleted
npx convex run maintenance:wipeStoreData '{"confirm":"DELETE ALL STORE DATA"}' --prod
```

Run the last command again if any table still reports `remaining` above 0.

## Seed cleanup

Back up with `npx convex export --path .backups/dev.zip` or add `--prod` for production. Run `node scripts/cleanup-seeds.mjs` for a dry run, then add `--apply` to remove only matching original seed records. Add `--prod` to target production. Cleanup is idempotent and preserves nonseed orders, including their historical product names and prices. No seeds run on startup. Backups and environment secrets are ignored by git.

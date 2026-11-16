# bridetouch

Handmade boutique storefront and store-management dashboard UI preview.

## Source

This repository was recovered from the latest deployed Cloudflare Worker `melo-handmade-baseline` on November 16, 2026.

- `src/index.html`: editable storefront and dashboard UI, including CSS and JavaScript
- `worker.js`: Cloudflare Worker serving the Brotli-compressed app
- `scripts/build-worker.mjs`: regenerates the Worker from the HTML
- `wrangler.jsonc`: Cloudflare Worker configuration

## Run

Open `src/index.html` in a browser, or run a local static server. The default route is `#/shop`; internal navigation uses hash routes.

To regenerate the worker, run:

```sh
npm run build
```

To preview with Cloudflare:

```sh
npx wrangler dev
```

**Deployment warning:** `npm run deploy` would deploy to the existing Worker name `melo-handmade-baseline`, potentially overwriting the live site. This import does **not** deploy or modify Cloudflare.

## Scope

This is a UI preview, not a production commerce backend. Checkout, real authentication, and a persistent product/order database are not configured. It was recovered from a deployed standalone HTML/Worker bundle rather than an original framework repository.

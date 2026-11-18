// Vercel build. Production deploys update the Convex backend first and then
// build the site against it, so the frontend and backend always match:
//   • Production (CONVEX_DEPLOY_KEY set): `convex deploy`, then `npm run build`
//     with VITE_CONVEX_URL pointing at the deployed backend.
//   • Previews / no key: just `npm run build` with the VITE_* variables you set.
import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit", env: process.env });
const isProduction = process.env.VERCEL_ENV === "production";

if (isProduction && process.env.CONVEX_DEPLOY_KEY) {
  console.log("Deploying Convex backend, then building the site…");
  run('npx convex deploy --cmd "npm run build" --cmd-url-env-var-name VITE_CONVEX_URL');
} else {
  if (isProduction) console.warn("CONVEX_DEPLOY_KEY is not set: the Convex backend was NOT deployed. Add it in Vercel → Settings → Environment Variables.");
  run("npm run build");
}

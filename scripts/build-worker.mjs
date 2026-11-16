import { execFileSync } from "node:child_process";
execFileSync(process.execPath,["node_modules/vite/bin/vite.js","build"],{stdio:"inherit"});
console.log("Built the React storefront and dashboard for Cloudflare Assets.");

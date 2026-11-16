import { execFileSync } from "node:child_process";
const args = ["node_modules/convex/bin/main.js","run","maintenance:removeSeeds",JSON.stringify({apply:process.argv.includes("--apply")})];
if (process.argv.includes("--prod")) args.push("--prod");
execFileSync(process.execPath,args,{stdio:"inherit"});

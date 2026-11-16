import { test, expect, vi } from "vitest";
import worker from "../api/worker.js";
test("upload verifies JWT header kid, admin access, image type and CORS",async()=>{
 const pair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
 const jwk={...await crypto.subtle.exportKey("jwk",pair.publicKey),kid:"header-key"};
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
 const body=`${encode({alg:"RS256",kid:jwk.kid})}.${encode({iss:"https://humane-satyr-4557.clerk.accounts.dev",sub:"owner",exp:Math.floor(Date.now()/1000)+300})}`;
 const token=`${body}.${Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(body))).toString("base64url")}`;
 let allowed=true;const put=vi.fn();
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>url.endsWith("jwks.json")?Response.json({keys:[jwk]}):Response.json({value:allowed})));
 const env={ALLOWED_ORIGINS:"http://localhost:5173",DEV_CONVEX_URL:"https://backend.example",IMAGES:{put}};
 const upload=(type="image/png",origin="http://localhost:5173",auth=token)=>{
  const form=new FormData();form.append("file",new File(["bytes"],"image.png",{type}));
  return worker.fetch(new Request("https://images.example/images",{method:"POST",headers:{Origin:origin,Authorization:`Bearer ${auth}`},body:form}),env);
 };
 try {
  expect((await upload()).status).toBe(200);expect(put).toHaveBeenCalledTimes(1);
  expect((await upload("image/svg+xml")).status).toBe(400);
  expect((await upload("image/png","https://foreign.example")).status).toBe(403);
  expect((await upload("image/png","http://localhost:5173","bad-token")).status).toBe(401);
  allowed=false;expect((await upload()).status).toBe(403);expect(put).toHaveBeenCalledTimes(1);
 } finally {vi.unstubAllGlobals();}
});

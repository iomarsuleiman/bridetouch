import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test, expect, vi } from "vitest";
test("service worker displays background push and opens the order dashboard",async()=>{
 const handlers:Record<string,(event:any)=>void>={};
 const showNotification=vi.fn(async()=>{});const openWindow=vi.fn(async()=>{});
 runInNewContext(readFileSync("public/sw.js","utf8"),{self:{addEventListener:(type:string,handler:any)=>{handlers[type]=handler;},registration:{showNotification},clients:{matchAll:async()=>[],openWindow},location:{origin:"https://store.example"}},URL,Response,fetch});
 let pending=Promise.resolve();handlers.push({data:{json:()=>({title:"New order",body:"Order 123"})},waitUntil:(promise:Promise<void>)=>{pending=promise;}});await pending;
 expect(showNotification).toHaveBeenCalledWith("New order",expect.objectContaining({body:"Order 123"}));
 handlers.notificationclick({notification:{close:vi.fn()},waitUntil:(promise:Promise<void>)=>{pending=promise;}});await pending;
 expect(openWindow).toHaveBeenCalledWith("/admin/orders");
 const manifest=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));expect(manifest.display).toBe("standalone");
 for(const icon of manifest.icons) expect(readFileSync(`public${icon.src}`).length).toBeGreaterThan(0);
});

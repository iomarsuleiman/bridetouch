self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request).catch(() => new Response('<!doctype html><title>Offline</title><main style="font:16px system-ui;padding:48px"><h1>You are offline</h1><p>Connect to the internet to visit bridetouch.</p></main>',{headers:{"Content-Type":"text/html"}})));
});
self.addEventListener("push", event => {
  let data = {};try {data = event.data?.json() ?? {};} catch {}
  event.waitUntil(self.registration.showNotification(data.title || "bridetouch",{body:data.body || "You have a new update.",icon:"/bridetouch-logo.png",tag:"bridetouch-order",data:{url:"/admin/orders"}}));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients => {
    const client = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (client) {await client.navigate("/admin/orders");return client.focus();}
    return self.clients.openWindow("/admin/orders");
  }));
});

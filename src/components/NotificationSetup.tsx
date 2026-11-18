import { friendlyError } from "../lib/format";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
export function NotificationSetup() {
  const key = useQuery(api.push.configuration);
  const subscribe = useMutation(api.push.subscribe);
  const unsubscribe = useMutation(api.push.unsubscribe);
  const [enabled,setEnabled] = useState(false);
  const [busy,setBusy] = useState(false);
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  useEffect(()=>{if (supported) navigator.serviceWorker.getRegistration().then(reg=>reg?.pushManager.getSubscription()).then(sub=>setEnabled(!!sub)).catch(()=>{});},[supported]);
  async function toggle() {
    setBusy(true);
    try {
      if (!supported || !key) throw new Error("Push notifications are unavailable in this browser");
      if (!enabled && await Notification.requestPermission() !== "granted") throw new Error("Notifications are blocked. Enable them in your browser settings.");
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (enabled && current) {await unsubscribe({endpoint:current.endpoint});await current.unsubscribe();setEnabled(false);toast.success("Notifications disabled on this device");return;}
      const raw = atob(key.replace(/-/g,"+").replace(/_/g,"/"));
      const applicationServerKey = Uint8Array.from(raw,char=>char.charCodeAt(0));
      const sub = current ?? await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Browser returned an invalid subscription");
      await subscribe({endpoint:json.endpoint,expirationTime:json.expirationTime ?? null,keys:{p256dh:json.keys.p256dh,auth:json.keys.auth}});
      setEnabled(true);toast.success("New order notifications enabled");
    } catch(error) {toast.error(friendlyError(error, "Could not enable notifications"));}
    finally {setBusy(false);}
  }
  return <section className="notification-setup"><h3>New order notifications</h3><p>Get an alert on this device when an order arrives, even with the app closed.</p>{!supported ? <p>Use a supported browser. On iPhone, open this page in Safari, tap Share → Add to Home Screen, then open the dashboard from there.</p> : key === null ? <p>Notifications aren't set up on the server yet (missing VAPID keys).</p> : <button className="btn secondary" disabled={busy || !key} onClick={toggle}>{busy ? "Updating…" : enabled ? "Disable on this device" : "Enable notifications"}</button>}</section>;
}

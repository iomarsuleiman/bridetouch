import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { NotificationSetup } from "./NotificationSetup";

const KEY = "notification-prompt-dismissed";
/** One-time nudge to turn on order alerts. Hidden once dismissed (on this
 *  device), once permission was answered, or when push isn't available. */
export function NotificationPrompt() {
  const key = useQuery(api.push.configuration);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === "true"; } catch { return false; }
  });
  if (dismissed || !key || !("Notification" in window) || !("PushManager" in window) || Notification.permission !== "default") return null;
  return (
    <aside className="notification-prompt">
      <NotificationSetup />
      <button className="text-button" onClick={() => { try { localStorage.setItem(KEY, "true"); } catch { /* ignore */ } setDismissed(true); }}>Not now</button>
    </aside>
  );
}

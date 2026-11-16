import { useState } from "react";
import { NotificationSetup } from "./NotificationSetup";
export function NotificationPrompt() {
  const [dismissed,setDismissed] = useState(()=>sessionStorage.getItem("notification-prompt-dismissed") === "true");
  if (dismissed || !("Notification" in window) || Notification.permission !== "default") return null;
  return <aside className="notification-prompt"><NotificationSetup /><button className="text-button" onClick={()=>{sessionStorage.setItem("notification-prompt-dismissed","true");setDismissed(true);}}>Not now</button></aside>;
}

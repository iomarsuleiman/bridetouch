import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import { CartProvider } from "./lib/cart";
import "./styles.css";
import "./receipt.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const root = ReactDOM.createRoot(document.getElementById("root")!);

if (!convexUrl || !clerkKey) {
  // A build without its configuration would otherwise crash to a blank page.
  console.error("Missing VITE_CONVEX_URL or VITE_CLERK_PUBLISHABLE_KEY at build time.");
  root.render(
    <main style={{ font: "16px system-ui", padding: 48, textAlign: "center", color: "#34382f" }}>
      <h1 style={{ fontWeight: 600 }}>We'll be right back.</h1>
      <p>The shop is being set up. Please check again shortly.</p>
    </main>,
  );
} else {
  mount(convexUrl, clerkKey);
}

function mount(url: string, publishableKey: string) {
const convex = new ConvexReactClient(url);

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ToastProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ToastProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => console.error("Service worker registration failed",error));
  });
}

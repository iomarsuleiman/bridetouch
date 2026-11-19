import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { lazy, Suspense, useEffect } from "react";
import { Show, SignInButton, SignOutButton, useUser } from "@clerk/react";
import { useHashRoute } from "./hooks/useHashRoute";
import { Icon } from "./components/Icon";
import Storefront from "./store/Storefront";
import { ErrorBoundary } from "./components/ErrorBoundary";

// The dashboard is a separate chunk, so shoppers never download it.
const AdminApp = lazy(() => import("./admin/AdminApp"));

export default function App() {
  const route = useHashRoute();

  // New pages start at the top; an instant jump avoids a long animated scroll
  // through the previous page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route.area, route.view, route.area === "store" ? route.productId : 0]);

  const resetKey = location.pathname + location.search;

  if (route.area === "admin") {
    return (
      <ErrorBoundary resetKey={resetKey}>
        <Show when="signed-in" fallback={<SignInPrompt />}>
          <AdminAccess view={route.view} />
        </Show>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary resetKey={resetKey}>
      <Storefront route={route} />
    </ErrorBoundary>
  );
}

// Shown at /admin when nobody is signed in. The dashboard is intentionally
// reachable only by typing the URL — the storefront never links here.
function SignInPrompt() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8f9f6",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 46,
            height: 46,
            margin: "0 auto 14px",
            background: "#eac3b7",
            borderRadius: "14px 14px 14px 3px",
            display: "grid",
            placeItems: "center",
            transform: "rotate(-8deg)",
          }}
        >
          <Icon name="sparkle" />
        </div>
        <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, margin: "0 0 6px" }}>
          bridetouch dashboard
        </h1>
        <p style={{ color: "#888d85", margin: "0 0 18px" }}>
          Sign in to manage your store.
        </p>
        <SignInButton mode="modal">
          <button className="btn primary" style={{ padding: "12px 22px" }}>
            Sign in <Icon name="arrow" size="sm" />
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

function AdminAccess({view}:{view:string}) {
  const allowed = useQuery(api.access.current);
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (allowed === undefined) return <PageSpinner label="Checking access…" />;
  if (!allowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f8f9f6",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, margin: "0 0 8px" }}>
            Administrator access required
          </h1>
          <p style={{ color: "#888d85", margin: "0 0 20px" }}>
            {email ? <><strong style={{ color: "#4c574d" }}>{email}</strong> isn't an administrator of this store.</> : "This account cannot manage the store."}{" "}
            Sign out to use an administrator account, or ask the store owner to add this email in Settings → Administrators.
          </p>
          <SignOutButton redirectUrl="/admin">
            <button type="button" className="btn primary" style={{ padding: "12px 22px" }}>
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={<PageSpinner label="Opening dashboard…" />}>
      <AdminApp view={view} />
    </Suspense>
  );
}

function PageSpinner({ label }: { label: string }) {
  return (
    <div className="page-spinner" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

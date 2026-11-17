import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";
import { Show, SignInButton, SignOutButton } from "@clerk/react";
import { useHashRoute } from "./hooks/useHashRoute";
import { Icon } from "./components/Icon";
import Storefront from "./store/Storefront";
import AdminApp from "./admin/AdminApp";

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    document.title = (route.area === "admin" ? "Dashboard · " : "") + "bridetouch";
  }, [route.area]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [route]);

  if (route.area === "admin") {
    return (
      <Show when="signed-in" fallback={<SignInPrompt />}>
        <AdminAccess view={route.view} />
      </Show>
    );
  }

  return <Storefront route={route} />;
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
  if (allowed === undefined) return <div className="empty">Checking access?</div>;
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
            This account cannot manage the store. Sign out to use an administrator account.
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
  return <AdminApp view={view} />;
}

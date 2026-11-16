import { UserButton } from "@clerk/react";
import { Icon } from "../components/Icon";

const NAMES: Record<string, string> = {
  overview: "Overview",
  orders: "Orders",
  products: "Products",
  collections: "Collections",
  customers: "Customers",
  discounts: "Discounts",
  sales: "Sales",
  offers: "Offers & campaigns",
  analytics: "Analytics",
  shipping: "Shipping & delivery",
  settings: "Settings",
};

// Port of the vanilla topbar().
export function Topbar({
  view,
  newOrders,
  onOpenSidebar,
  onOpenCommand,
  onOpenShortcuts,
  onOpenNotifications,
}: {
  view: string;
  newOrders: number;
  onOpenSidebar: () => void;
  onOpenCommand: () => void;
  onOpenShortcuts: () => void;
  onOpenNotifications: () => void;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button className="btn icon-only ghost mobile-menu-button" aria-label="Open navigation" onClick={onOpenSidebar}>
          <Icon name="menu" />
        </button>
        <span className="muted">Store</span>
        <Icon name="right" size="sm" />
        <span>{NAMES[view] ?? "Overview"}</span>
      </div>
      <div className="topbar-right">
        <button className="top-search" onClick={onOpenCommand}>
          <Icon name="search" size="sm" /> Search pages <span className="kbd">⌘ K</span>
        </button>
        <button className="icon-wrap" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={onOpenShortcuts}>
          <Icon name="help" />
        </button>
        <button className="icon-wrap" aria-label="Notifications" title="Notifications" onClick={onOpenNotifications}>
          <Icon name="bell" />
          {newOrders ? <span className="notif-dot" /> : null}
        </button>
        <UserButton />
      </div>
    </header>
  );
}

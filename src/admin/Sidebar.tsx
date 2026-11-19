import { Fragment } from "react";
import { Icon } from "../components/Icon";
import { navigate } from "../hooks/useHashRoute";
import { BrandLogo } from "../components/BrandLogo";

const GROUPS: { label: string; items: { view: string; label: string; icon: string }[] }[] = [
  {
    label: "",
    items: [{ view: "overview", label: "Home", icon: "home" }],
  },
  {
    label: "Commerce",
    items: [
      { view: "orders", label: "Orders", icon: "bag" },
      { view: "products", label: "Products", icon: "package" },
      { view: "collections", label: "Collections", icon: "grid2" },
      { view: "customers", label: "Customers", icon: "users" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { view: "discounts", label: "Discount codes", icon: "tag" },
      { view: "sales", label: "Sales", icon: "percent" },
      { view: "offers", label: "Banners", icon: "megaphone" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { view: "appearance", label: "Appearance", icon: "palette" },
      { view: "navigation", label: "Navigation", icon: "link" },
      { view: "pages", label: "Pages & policies", icon: "file" },
    ],
  },
  {
    label: "Insights",
    items: [{ view: "analytics", label: "Analytics", icon: "chart" }],
  },
];

// Port of the vanilla sidebar() + navItem().
export function Sidebar({
  view,
  newOrders,
  openReturns = 0,
  storeName,
  logoImage,
  open,
  onClose,
}: {
  view: string;
  newOrders: number;
  openReturns?: number;
  storeName: string;
  logoImage?: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside className={"sidebar" + (open ? " open" : "")} aria-label="Admin navigation">
      <div className="sidebar-brand">
        <button className="brand" onClick={() => navigate("admin/overview")}>
          <BrandLogo src={logoImage} name={storeName} />
          <span className="brand-word">{storeName}.</span>
        </button>
        <button className="btn icon-only ghost mobile-menu-button" onClick={onClose} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      </div>
      <div className="sidebar-nav">
        {GROUPS.map((group) => (
          <Fragment key={group.label}>
            {group.label ? <div className="sidebar-group-label">{group.label}</div> : null}
            {group.items.map((item) => {
              const active = view === item.view;
              return (
                <button
                  key={item.view}
                  className={"nav-link" + (active ? " active" : "")}
                  onClick={() => navigate("admin/" + item.view)}
                  {...(active ? { "aria-current": "page" } : {})}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.view === "orders" && newOrders > 0 ? <span className="nav-count">{newOrders}</span> : null}
                  {item.view === "orders" && openReturns > 0 ? <span className="nav-count returns" title="Open return requests">{openReturns}</span> : null}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="sidebar-foot">
        <button className={"nav-link" + (view === "settings" || view === "shipping" ? " active" : "")} onClick={() => navigate("admin/settings")}>
          <Icon name="settings" />
          <span>Settings</span>
        </button>
        <button className="store-switch" onClick={() => navigate("shop")}>
          <span className="avatar">{(storeName.trim()[0] ?? "b").toUpperCase()}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong>{storeName}</strong>
            <small>View storefront</small>
          </span>
          <Icon name="external" size="sm" />
        </button>
      </div>
    </aside>
  );
}

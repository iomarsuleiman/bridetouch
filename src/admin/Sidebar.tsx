import { Fragment } from "react";
import { Icon } from "../components/Icon";
import { navigate } from "../hooks/useHashRoute";
import { BrandLogo } from "../components/BrandLogo";

const GROUPS: { label: string; items: { view: string; label: string; icon: string }[] }[] = [
  {
    label: "WORKSPACE",
    items: [
      { view: "overview", label: "Overview", icon: "grid" },
      { view: "orders", label: "Orders", icon: "bag" },
      { view: "products", label: "Products", icon: "package" },
      { view: "collections", label: "Collections", icon: "grid2" },
      { view: "customers", label: "Customers", icon: "users" },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { view: "discounts", label: "Discounts", icon: "tag" },
      { view: "sales", label: "Sales", icon: "percent" },
      { view: "offers", label: "Offers & campaigns", icon: "gift" },
      { view: "analytics", label: "Analytics", icon: "chart" },
    ],
  },
  {
    label: "STORE",
    items: [
      { view: "shipping", label: "Shipping & delivery", icon: "truck" },
      { view: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

// Port of the vanilla sidebar() + navItem().
export function Sidebar({
  view,
  newOrders,
  storeName,
  logoImage,
  open,
  onClose,
}: {
  view: string;
  newOrders: number;
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
            <div className="sidebar-group-label">{group.label}</div>
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
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="sidebar-foot">
        <button className="store-switch" onClick={() => navigate("shop")}>
          <span className="avatar">m</span>
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

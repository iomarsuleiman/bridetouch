import { NotificationPrompt } from "../components/NotificationPrompt";
import { useEffect, useState, type ComponentType } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Modals } from "./Modals";
import { OverviewPage } from "./OverviewPage";
import { OrdersPage } from "./OrdersPage";
import { ProductsPage } from "./ProductsPage";
import { CollectionsPage } from "./CollectionsPage";
import { DiscountsPage } from "./DiscountsPage";
import { OffersPage } from "./OffersPage";
import { SalesPage } from "./SalesPage";
import { CustomersPage } from "./CustomersPage";
import { AnalyticsPage } from "./AnalyticsPage";
import { ShippingPage } from "./ShippingPage";
import { SettingsPage } from "./SettingsPage";
import type { AdminCtx, ModalKey } from "./types";
import { useScrollLock } from "../hooks/useScrollLock";
import { navigate } from "../hooks/useHashRoute";

const PAGES: Record<string, ComponentType<{ ctx: AdminCtx }>> = {
  overview: OverviewPage,
  orders: OrdersPage,
  products: ProductsPage,
  collections: CollectionsPage,
  customers: CustomersPage,
  discounts: DiscountsPage,
  offers: OffersPage,
  sales: SalesPage,
  analytics: AnalyticsPage,
  shipping: ShippingPage,
  settings: SettingsPage,
};

// Port of the vanilla admin() shell. Owns the shared modal state and the
// selected doc ids, and hands open/close callbacks down to the pages.
export default function AdminApp({ view }: { view: string }) {
  const products = useQuery(api.products.list);
  const orders = useQuery(api.orders.list);
  const coupons = useQuery(api.coupons.list);
  const offers = useQuery(api.offers.list);
  const sales = useQuery(api.sales.list);
  const collections = useQuery(api.collections.list);
  const settings = useQuery(api.settings.getForAdmin);

  const [modal, setModal] = useState<ModalKey | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<Id<"offers"> | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"collections"> | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const ready =
    products !== undefined &&
    orders !== undefined &&
    coupons !== undefined &&
    offers !== undefined &&
    sales !== undefined &&
    collections !== undefined &&
    settings !== undefined;

  // Vanilla route() cleared overlays on navigation.
  useEffect(() => {
    setModal(null);
    setMobileSidebar(false);
  }, [view]);

  // Lock the page behind dialogs and the mobile sidebar (works on iOS too).
  useScrollLock(!!modal || mobileSidebar);

  useEffect(() => {
    const names: Record<string, string> = { overview: "Overview", orders: "Orders", products: "Products", collections: "Collections", customers: "Customers", discounts: "Discounts", sales: "Sales", offers: "Offers", analytics: "Analytics", shipping: "Shipping", settings: "Settings" };
    document.title = `${names[view] ?? "Dashboard"} · Dashboard`;
  }, [view]);

  // Port of the vanilla keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (e.key === "Escape") {
        setModal(null);
        setMobileSidebar(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal("command");
      } else if (!typing && e.key === "?") {
        e.preventDefault();
        setModal("shortcuts");
      } else if (!typing && e.key === "/" && !modal) {
        e.preventDefault();
        const q = document.querySelector<HTMLInputElement>(
          '.admin-body input[aria-label="Search orders"], .admin-body input[aria-label="Search products"]',
        );
        if (q) q.focus();
        else setModal("command");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  const newOrders = orders ? orders.filter((o) => o.status === "New").length : 0;

  const ctx: AdminCtx | null =
    ready && products && orders && coupons && offers && sales && collections && settings
      ? {
          view,
          products,
          orders,
          coupons,
          offers,
          sales,
          collections,
          settings,
          openModal: (m) => setModal(m),
          openOrder: (id) => {
            setSelectedOrderId(id);
            setModal("order");
          },
          openEditProduct: (id) => {
            setSelectedProductId(id);
            setModal("edit-product");
          },
          openEditOffer: (id) => {
            setSelectedOfferId(id);
            setModal("edit-offer");
          },
          openEditCollection: (id) => {
            setSelectedCollectionId(id);
            setModal("edit-collection");
          },
          closeSidebar: () => setMobileSidebar(false),
        }
      : null;

  const Page = PAGES[view] ?? OverviewPage;
  useEffect(() => {
    if (!PAGES[view]) navigate("admin/overview", { replace: true });
  }, [view]);

  return (
    <div className="admin">
      <div className="admin-shell">
        <Sidebar
          view={view}
          newOrders={newOrders}
          storeName={settings?.storeName ?? "bridetouch"}
          logoImage={settings?.logoImage}
          open={mobileSidebar}
          onClose={() => setMobileSidebar(false)}
        />
        {mobileSidebar ? (
          <button className="sidebar-scrim" onClick={() => setMobileSidebar(false)} aria-label="Close navigation" />
        ) : null}
        <div className="admin-main">
          <Topbar
            view={view}
            newOrders={newOrders}
            onOpenSidebar={() => setMobileSidebar(true)}
            onOpenCommand={() => setModal("command")}
            onOpenShortcuts={() => setModal("shortcuts")}
            onOpenNotifications={() => setModal("notifications")}
          />
          <main key={view} id="main" className="admin-body page-animate">
            {ctx ? (
              <>{settings?.notifications && view === "overview" ? <NotificationPrompt /> : null}<Page ctx={ctx} /></>
            ) : (
              <div className="page-spinner" role="status"><span className="spinner" aria-hidden="true" /> Loading your store…</div>
            )}
          </main>
        </div>
      </div>
      {ctx && modal ? (
        <Modals
          key={
            modal +
            ":" +
            String(selectedProductId) +
            ":" +
            String(selectedOfferId) +
            ":" +
            String(selectedCollectionId) +
            ":" +
            String(selectedOrderId)
          }
          modal={modal}
          products={ctx.products}
          orders={ctx.orders}
          offers={ctx.offers}
          collections={ctx.collections}
          settings={ctx.settings}
          selectedProductId={selectedProductId}
          selectedOfferId={selectedOfferId}
          selectedCollectionId={selectedCollectionId}
          selectedOrderId={selectedOrderId}
          onClose={() => setModal(null)}
          onOpenOrder={ctx.openOrder}
        />
      ) : null}
    </div>
  );
}

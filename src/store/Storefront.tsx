import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";
import { BrandLogo } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import { navigate } from "../hooks/useHashRoute";
import { StoreUIProvider, type StoreUI } from "./ui";
import { PromoBanner } from "./PromoBanner";
import { HomePage } from "./HomePage";
import { CatalogPage } from "./CatalogPage";
import { ProductDetailPage } from "./ProductDetailPage";
import { CheckoutPage } from "./CheckoutPage";
import { ConfirmationPage } from "./ConfirmationPage";
import { CartSheet } from "./CartSheet";
import { StoreFooter } from "./StoreFooter";

export type StoreRoute = {
  view: "shop" | "catalog" | "product" | "checkout" | "confirmation";
  productId?: number;
};

// Port of storeHeader()/store() from src/index.html, with the ui object
// replaced by React state and data-act handlers replaced by callbacks.
export default function Storefront({ route }: { route: StoreRoute }) {
  const products = useQuery(api.products.list);
  const collections = useQuery(api.collections.list) ?? [];
  const settings = useQuery(api.settings.get);
  const cart = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [storeCategory, setStoreCategory] = useState(() => new URLSearchParams(location.search).get("category") ?? "All");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Doc<"coupons"> | null>(null);
  const [lastOrder, setLastOrder] = useState<Doc<"orders"> | null>(null);

  // Vanilla route() closes the drawer and the mobile nav on every navigation.
  useEffect(() => {
    setCartOpen(false);
    setMobileNav(false);
  }, [route]);

  // Vanilla render() locks body scroll while the cart sheet is open.
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCartOpen(false);
        setMobileNav(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const goToCategory = useCallback((category: string) => {
    setStoreCategory(category);
    setCartOpen(false);
    setMobileNav(false);
    navigate("catalog" + (category === "All" ? "" : "?category=" + encodeURIComponent(category)));
  }, []);

  useEffect(() => {
    setStoreCategory(new URLSearchParams(location.search).get("category") ?? "All");
  }, [route]);
  const openSearch = () => {
    setStoreCategory("All");
    navigate("catalog");
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#catalog-search")?.focus(), 100);
  };

  const ui: StoreUI = {
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    goToCategory,
  };

  const goHome = () => {
    setCartOpen(false);
    setMobileNav(false);
    navigate("shop");
  };

  const handleOrderPlaced = (order: Doc<"orders">) => {
    setLastOrder(order);
    cart.clear();
    setAppliedCoupon(null);
    setCouponInput("");
    navigate("confirmation");
  };

  let page: ReactNode;
  if (!products || !settings) {
    page = <div className="empty">Loading…</div>;
  } else if (route.view === "catalog") {
    page = <CatalogPage products={products} category={storeCategory} collections={collections} settings={settings} />;
  } else if (route.view === "product") {
    const p = products.find((x) => x.number === route.productId);
    page = p ? (
      <ProductDetailPage key={p.number} product={p} />
    ) : (
      <div className="empty">Loading…</div>
    );
  } else if (route.view === "checkout") {
    page = (
      <CheckoutPage
        products={products}
        settings={settings}
        appliedCoupon={appliedCoupon}
        onOrderPlaced={handleOrderPlaced}
      />
    );
  } else if (route.view === "confirmation") {
    // Vanilla confirmed() falls back to the home page without a last order.
    page = lastOrder ? (
      <ConfirmationPage order={lastOrder} settings={settings} />
    ) : (
      <HomePage products={products} settings={settings} collections={collections} />
    );
  } else {
    page = <HomePage products={products} settings={settings} collections={collections} />;
  }


  return (
    <StoreUIProvider value={ui}>
      <div className={"store-frame" + (cartOpen ? " pushed" : "")}>
        <div className={"store" + (route.view === "confirmation" && lastOrder ? " store-confirmation" : "")}>
          <PromoBanner />
          {settings?.announcement ? <div className="store-announcement">{settings.announcement}</div> : null}
          <header className="store-header">
              <button
                type="button"
                className="btn icon-only ghost store-mobile-menu"
                aria-label="Toggle store menu"
                aria-expanded={mobileNav}
                aria-controls="store-navigation"
                onClick={() => setMobileNav((v) => !v)}
              >
                <Icon name={mobileNav ? "close" : "menu"} />
              </button>
            <button className="brand" onClick={goHome} aria-label="bridetouch home">
              <BrandLogo src={settings?.logoImage} name={settings?.storeName} />
              <span className="brand-word">{settings?.storeName ?? "bridetouch"}.</span>
            </button>
            <nav
              id="store-navigation"
              aria-label="Store navigation"
              className={"store-nav" + (mobileNav ? " open" : "")}
            >
              <button onClick={goHome} className={route.view === "shop" ? "active" : ""}>
                Home
              </button>
              <button
                onClick={() => goToCategory("All")}
                className={route.view === "catalog" ? "active" : ""}
              >
                Shop all
              </button>
              {(settings?.navigation ?? [...new Set((products ?? []).map(product => product.category))].slice(0,2)).map(name => <button key={name} className={route.view === "catalog" && storeCategory === name ? "active" : ""} onClick={() => goToCategory(name)}>{name}</button>)}
              {settings?.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
              {settings?.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}
            </nav>
            <div className="header-actions">

              <button
                type="button"
                className="btn icon-only ghost"
                aria-label="Search products"
                onClick={openSearch}
              >
                <Icon name="search" />
              </button>
              <button
                type="button"
                className="btn icon-only ghost cart-trigger"
                aria-label={`Open bag, ${cart.count} items`}
                onClick={() => setCartOpen(true)}
              >
                <Icon name="bag" />
                {cart.count ? (
                  <span className="cart-count" aria-hidden="true">
                    {cart.count}
                  </span>
                ) : null}
              </button>
            </div>
          </header>
          {mobileNav ? <button className="store-menu-scrim" type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation menu" /> : null}
          <main id="main" className="page-animate">
            {page}
          </main>
          {route.view !== "confirmation" || !lastOrder ? <StoreFooter settings={settings} /> : null}
        </div>
      </div>
      {cartOpen && settings && products ? (
        <CartSheet
          products={products}
          settings={settings}
          couponInput={couponInput}
          onCouponInputChange={setCouponInput}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={setAppliedCoupon}
        />
      ) : null}
    </StoreUIProvider>
  );
}

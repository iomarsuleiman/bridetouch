import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useCart } from "../lib/cart";
import { BrandLogo } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import { linkHandler, navigate, type StoreView } from "../hooks/useHashRoute";
import { NotFoundPage } from "./NotFoundPage";
import { StoreSkeleton } from "./StoreSkeleton";
import { useScrollReveal } from "../lib/reveal";
import { useScrollLock } from "../hooks/useScrollLock";
import { StoreUIProvider, type StoreUI } from "./ui";
import { PromoBanner } from "./PromoBanner";
import { HomePage } from "./HomePage";
import { CatalogPage } from "./CatalogPage";
import { ProductDetailPage } from "./ProductDetailPage";
import { CheckoutPage } from "./CheckoutPage";
import { ConfirmationPage } from "./ConfirmationPage";
import { CartSheet } from "./CartSheet";
import { StoreFooter } from "./StoreFooter";
import { PageView } from "./PageView";
import { TrackPage } from "./TrackPage";
import { effectiveLinks, isExternal, linkHref } from "../lib/navLinks";

export type StoreRoute = {
  view: StoreView;
  productId?: number;
  slug?: string;
};

// The confirmation page survives a refresh for the rest of the browser session.
const LAST_ORDER_KEY = "bridetouch-last-order";
function readLastOrder(): Doc<"orders"> | null {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || "null");
  } catch {
    return null;
  }
}

// Port of storeHeader()/store() from src/index.html, with the ui object
// replaced by React state and data-act handlers replaced by callbacks.
export default function Storefront({ route }: { route: StoreRoute }) {
  const products = useQuery(api.products.list);
  const collections = useQuery(api.collections.list) ?? [];
  const settings = useQuery(api.settings.get);
  const categoryList = useQuery(api.categories.list) ?? [];
  const cart = useCart();
  useScrollReveal();

  // Brand accent from Appearance settings, used for sale prices and highlights.
  useEffect(() => {
    if (settings?.accentColor) document.documentElement.style.setProperty("--accent", settings.accentColor);
  }, [settings?.accentColor]);

  // Arc-style floating header: compacts once you scroll.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [storeCategory, setStoreCategory] = useState(() => new URLSearchParams(location.search).get("category") ?? "All");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Doc<"coupons"> | null>(null);
  const [lastOrder, setLastOrder] = useState<Doc<"orders"> | null>(readLastOrder);

  // Drop bag lines whose product has been deleted, so checkout can't fail on them.
  const { items: cartItems, remove: removeFromCart } = cart;
  useEffect(() => {
    if (!products) return;
    for (const item of cartItems) {
      if (!products.some((p) => p.number === item.number)) removeFromCart(item.number, item.variant);
    }
  }, [products, cartItems, removeFromCart]);

  // Vanilla route() closes the drawer and the mobile nav on every navigation.
  useEffect(() => {
    setCartOpen(false);
    setMobileNav(false);
  }, [route]);

  // Lock the page behind the bag and the mobile menu (works on iOS too).
  useScrollLock(cartOpen || mobileNav);

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

  const socialLinks = (settings?.socials ?? []).filter((social) => social.enabled && social.url.trim());
  // Existing stores may have a legacy Instagram URL, before configurable socials.
  if (!socialLinks.length && settings?.instagramUrl) {
    socialLinks.push({ network: "instagram", url: settings.instagramUrl, enabled: true });
  }
  const socialLabel = (network: string) => ({ instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" })[network as "instagram" | "facebook" | "tiktok"] ?? network;

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
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      // private mode: the confirmation simply won't survive a refresh
    }
    cart.clear();
    setAppliedCoupon(null);
    setCouponInput("");
    navigate("confirmation");
  };

  const categoryNames = [...new Set([...categoryList.map((c) => c.name), ...(products ?? []).map((p) => p.category)])];
  const menuLinks = effectiveLinks(settings, categoryNames, collections.map((c) => c.name)).filter((l) => !l.hidden);
  function isActiveLink(link: { type: string; target?: string }) {
    if (link.type === "home") return route.view === "shop";
    if (link.type === "catalog") return route.view === "catalog" && storeCategory === "All";
    if (link.type === "category" || link.type === "collection") return route.view === "catalog" && storeCategory === link.target;
    if (link.type === "product") return route.view === "product" && String(route.productId) === link.target;
    if (link.type === "page") return route.view === "page" && route.slug === link.target;
    if (link.type === "track") return route.view === "track";
    return false;
  }

  let page: ReactNode;
  if (!products || !settings) {
    page = <StoreSkeleton view={route.view} />;
  } else if (route.view === "notfound") {
    page = <NotFoundPage products={products} storeName={settings.storeName} />;
  } else if (route.view === "page" && route.slug) {
    page = <PageView slug={route.slug} products={products} storeName={settings.storeName} />;
  } else if (route.view === "track") {
    page = <TrackPage settings={settings} />;
  } else if (route.view === "catalog") {
    page = <CatalogPage products={products} category={storeCategory} collections={collections} settings={settings} />;
  } else if (route.view === "product") {
    const p = products.find((x) => x.number === route.productId);
    page = p ? (
      <ProductDetailPage key={p.number} product={p} products={products} settings={settings} />
    ) : (
      <NotFoundPage products={products} storeName={settings.storeName} kind="product" />
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
          <a className="skip-link" href="#main">Skip to content</a>
          <PromoBanner />
          {settings?.announcement ? <div className="store-announcement">{settings.announcement}</div> : null}
          <header className={"store-header" + (mobileNav ? " menu-open" : "") + (scrolled ? " scrolled" : "")}>
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
            <a className="brand" href="/" onClick={linkHandler("shop", goHome)} aria-label={`${settings?.storeName ?? "bridetouch"} home`}>
              <BrandLogo src={settings?.logoImage} name={settings?.storeName} />
              <span className="brand-word">{settings?.storeName ?? "bridetouch"}.</span>
            </a>
            <nav
              id="store-navigation"
              aria-label="Store navigation"
              className={"store-nav" + (mobileNav ? " open" : "")}
            >
              {menuLinks.map((link, i) => {
                const href = linkHref(link);
                const external = isExternal(link);
                const active = !external && isActiveLink(link);
                return (
                  <a
                    key={i}
                    href={href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {
                      onClick: linkHandler(href.replace(/^\//, "") || "shop", () => {
                        if (link.type === "home") goHome();
                        else if (link.type === "catalog") goToCategory("All");
                        else if (link.type === "category" || link.type === "collection") goToCategory(link.target ?? "All");
                      }),
                    })}
                  >
                    {link.label}
                  </a>
                );
              })}
              {settings?.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}
              {socialLinks.length ? (
                <div className="store-nav-social" aria-label="Social media">
                  {socialLinks.map((social) => (
                    <a key={social.network} href={social.url} target="_blank" rel="noopener noreferrer"
                      aria-label={socialLabel(social.network)} title={socialLabel(social.network)}>
                      <Icon name={social.network} size="sm" />
                    </a>
                  ))}
                </div>
              ) : null}
            </nav>
            <div className="header-actions">
              {socialLinks.length ? (
                <div className="header-social-links" aria-label="Social media">
                  {socialLinks.map((social) => (
                    <a key={social.network} href={social.url} target="_blank" rel="noopener noreferrer"
                      aria-label={socialLabel(social.network)} title={socialLabel(social.network)}>
                      <Icon name={social.network} size="sm" />
                    </a>
                  ))}
                </div>
              ) : null}
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
                  <span className="cart-count" key={cart.count} aria-hidden="true">
                    {cart.count}
                  </span>
                ) : null}
              </button>
            </div>
          </header>
          {mobileNav ? <button className="store-menu-scrim" type="button" onClick={() => setMobileNav(false)} aria-label="Close navigation menu" /> : null}
          <main id="main" className="page-animate" key={route.view + (route.productId ?? "") + (route.slug ?? "") + storeCategory} tabIndex={-1}>
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

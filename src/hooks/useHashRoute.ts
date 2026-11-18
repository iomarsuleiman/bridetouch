import type React from "react";
import { useEffect, useState } from "react";

export type StoreView = "shop" | "catalog" | "product" | "checkout" | "confirmation" | "notfound";
export type Route =
  | { area: "store"; view: StoreView; productId?: number }
  | { area: "admin"; view: string };

const STORE_VIEWS = new Set(["shop", "catalog", "checkout", "confirmation"]);

function parse(pathname: string): Route {
  const bits = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (bits[0] === "admin") {
    return { area: "admin", view: bits[1] || "overview" };
  }
  const view = bits[0] || "shop";
  if (view === "product") {
    const productId = Number(bits[1]);
    return Number.isSafeInteger(productId) && productId > 0 && bits.length === 2
      ? { area: "store", view: "product", productId }
      : { area: "store", view: "notfound" };
  }
  if (bits.length > 1 || !STORE_VIEWS.has(view)) return { area: "store", view: "notfound" };
  return { area: "store", view: view as StoreView };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parse(location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return route;
}

// Path-based SPA navigation: /shop, /catalog, /product/3, /admin/orders, ...
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  const url = "/" + path.replace(/^\/+/, "");
  if (url === location.pathname + location.search) return;
  history[replace ? "replaceState" : "pushState"]({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Click handler for real <a href> links: keeps SPA navigation for plain
 *  clicks but lets cmd/ctrl/middle-click open a new tab normally. */
export function linkHandler(path: string, before?: () => void) {
  return (event: React.MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    before?.();
    navigate(path);
  };
}

export const useRoute = useHashRoute;

import { useEffect, useState } from "react";

export type Route =
  | { area: "store"; view: "shop" | "catalog" | "product" | "checkout" | "confirmation"; productId?: number }
  | { area: "admin"; view: string };

function parse(pathname: string): Route {
  const bits = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (bits[0] === "admin") {
    return { area: "admin", view: bits[1] || "overview" };
  }
  const view = (bits[0] || "shop") as "shop" | "catalog" | "product" | "checkout" | "confirmation";
  if (view === "product" && bits[1]) {
    return { area: "store", view: "product", productId: Number(bits[1]) };
  }
  return { area: "store", view };
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
export function navigate(path: string) {
  history.pushState({}, "", "/" + path.replace(/^\/+/, ""));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const useRoute = useHashRoute;

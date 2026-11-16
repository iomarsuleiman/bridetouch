import { createContext, useContext, type ReactNode } from "react";

// Shared store UI actions, provided by Storefront and consumed by the
// storefront pages (replaces the vanilla data-act handlers that mutate
// ui.drawer / ui.storeCategory and re-route).
export type StoreUI = {
  openCart: () => void;
  closeCart: () => void;
  // Sets the catalog category (clearing it to "All" for plain catalog
  // navigation), closes the cart sheet and mobile nav, and routes to catalog.
  goToCategory: (category: string) => void;
};

const noop = () => {};

const Ctx = createContext<StoreUI>({
  openCart: noop,
  closeCart: noop,
  goToCategory: noop,
});

export function useStoreUI() {
  return useContext(Ctx);
}

export function StoreUIProvider({ value, children }: { value: StoreUI; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

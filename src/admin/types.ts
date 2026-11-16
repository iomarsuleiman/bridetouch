import type { Doc, Id } from "../../convex/_generated/dataModel";

export type ModalKey =
  | "add-product"
  | "edit-product"
  | "add-discount"
  | "add-offer"
  | "edit-offer"
  | "add-sale"
  | "add-collection"
  | "edit-collection"
  | "edit-shipping"
  | "new-order"
  | "order"
  | "shortcuts"
  | "command"
  | "notifications";

// Shared admin context: data + modal openers handed down to every page.
export type AdminCtx = {
  view: string;
  products: Doc<"products">[];
  orders: Doc<"orders">[];
  coupons: Doc<"coupons">[];
  offers: Doc<"offers">[];
  sales: Doc<"sales">[];
  collections: Doc<"collections">[];
  settings: Doc<"settings">;
  openModal: (modal: ModalKey) => void;
  openOrder: (id: Id<"orders">) => void;
  openEditProduct: (id: Id<"products">) => void;
  openEditOffer: (id: Id<"offers">) => void;
  openEditCollection: (id: Id<"collections">) => void;
  closeSidebar: () => void;
};

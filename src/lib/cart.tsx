import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { variantKey } from "../store/productVariants";
export type CartItem = { number: number; qty: number; color?: string; variant?: string[] };
export const cartItemKey = (item: Pick<CartItem, "number" | "variant">) =>
  `${item.number}:${variantKey(item.variant)}`;

type CartContext = {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQty: (number: number, qty: number, variant?: string[]) => void;
  remove: (number: number, variant?: string[]) => void;
  clear: () => void;
};

const Ctx = createContext<CartContext>({
  items: [],
  count: 0,
  add: () => {},
  setQty: () => {},
  remove: () => {},
  clear: () => {},
});

const STORAGE_KEY = "bridetouch-cart-v3";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — cart stays in memory
    }
  }, [items]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const found = prev.find((i) => cartItemKey(i) === cartItemKey(item));
      if (found) {
        return prev.map((i) =>
          cartItemKey(i) === cartItemKey(item) ? { ...i, qty: i.qty + item.qty } : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const setQty = useCallback((number: number, qty: number, variant?: string[]) => {
    const key = cartItemKey({ number, variant });
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => cartItemKey(i) !== key)
        : prev.map((i) => (cartItemKey(i) === key ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((number: number, variant?: string[]) => {
    const key = cartItemKey({ number, variant });
    setItems((prev) => prev.filter((i) => cartItemKey(i) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return (
    <Ctx.Provider
      value={{ items, count: items.reduce((s, i) => s + i.qty, 0), add, setQty, remove, clear }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  return useContext(Ctx);
}

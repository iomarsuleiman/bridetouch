import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartItem = { number: number; qty: number; color?: string };

type CartContext = {
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQty: (number: number, qty: number) => void;
  remove: (number: number) => void;
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
      const found = prev.find((i) => i.number === item.number);
      if (found) {
        return prev.map((i) =>
          i.number === item.number ? { ...i, qty: i.qty + item.qty } : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const setQty = useCallback((number: number, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.number !== number)
        : prev.map((i) => (i.number === number ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((number: number) => {
    setItems((prev) => prev.filter((i) => i.number !== number));
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

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { CatalogProduct } from "@/lib/catalog";

export type CartItem = { sku: string; name: string; price: number; category: string; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (p: CatalogProduct) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const KEY = "pc-cart-v1";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i): i is CartItem =>
                !!i && typeof i.sku === "string" && typeof i.qty === "number" && typeof i.price === "number",
            ),
          );
        }
      }
    } catch {
      // Storage unavailable: the cart simply starts empty.
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Ignore storage failures.
    }
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
    return {
      items,
      count,
      subtotal,
      open,
      setOpen,
      add: (p) =>
        setItems((prev) =>
          prev.some((i) => i.sku === p.sku)
            ? prev.map((i) => (i.sku === p.sku ? { ...i, qty: Math.min(99, i.qty + 1) } : i))
            : [...prev, { sku: p.sku, name: p.name, price: p.price, category: p.category, qty: 1 }],
        ),
      setQty: (sku, qty) =>
        setItems((prev) => prev.map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i))),
      remove: (sku) => setItems((prev) => prev.filter((i) => i.sku !== sku)),
      clear: () => setItems([]),
    };
  }, [items, open]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

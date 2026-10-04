import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { ProductCard } from "@/lib/api/products.functions";

export type CartItem = {
  sku: string;
  slug: string;
  name: string;
  price: number | null;
  category: string;
  image: string;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  /** Sum of priced items only. */
  subtotal: number;
  /** Number of lines that still need a price ("Call for price"). */
  unpriced: number;
  add: (p: ProductCard, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const KEY = "pc-cart-v2";
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
              (i): i is CartItem => !!i && typeof i.sku === "string" && typeof i.qty === "number" && typeof i.name === "string",
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
    const subtotal = items.reduce((n, i) => n + (i.price ?? 0) * i.qty, 0);
    const unpriced = items.filter((i) => i.price == null).length;
    return {
      items,
      count,
      subtotal,
      unpriced,
      open,
      setOpen,
      add: (p, qty = 1) =>
        setItems((prev) =>
          prev.some((i) => i.sku === p.partNumber)
            ? prev.map((i) => (i.sku === p.partNumber ? { ...i, qty: Math.min(99, i.qty + qty), price: p.price } : i))
            : [
                ...prev,
                { sku: p.partNumber, slug: p.slug, name: p.name, price: p.price, category: p.category, image: p.image, qty: Math.min(99, qty) },
              ],
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

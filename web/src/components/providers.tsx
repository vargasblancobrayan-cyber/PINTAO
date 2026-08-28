"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@/lib/types";

/* ---------------- Carrito ---------------- */

interface CartCtx {
  items: CartItem[];
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (productId: number, size: string, qty?: number) => void;
  remove: (productId: number, size: string) => void;
  setQty: (productId: number, size: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartCtx | null>(null);

function usePersistentState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {
      /* localStorage no disponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* localStorage no disponible */
        }
        return next;
      });
    },
    [key],
  );

  return [value, set];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = usePersistentState<CartItem[]>("pintao-cart", []);
  const [open, setOpen] = useState(false);

  const add = useCallback((productId: number, size: string, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === productId && i.size === size);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { productId, size, qty }];
    });
    setOpen(true);
  }, [setItems]);

  const remove = useCallback((productId: number, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)));
  }, [setItems]);

  const setQty = useCallback(
    (productId: number, size: string, qty: number) => {
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => !(i.productId === productId && i.size === size))
          : prev.map((i) => (i.productId === productId && i.size === size ? { ...i, qty } : i)),
      );
    },
    [setItems],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, count, open, setOpen, add, remove, setQty, clear }),
    [items, count, open, add, remove, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

/* ---------------- Favoritos ---------------- */

interface FavCtx {
  favorites: number[];
  toggle: (productId: number) => void;
  has: (productId: number) => boolean;
}

const FavContext = createContext<FavCtx | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = usePersistentState<number[]>("pintao-favs", []);

  const toggle = useCallback(
    (productId: number) =>
      setFavorites((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
      ),
    [setFavorites],
  );

  const has = useCallback((productId: number) => favorites.includes(productId), [favorites]);

  const value = useMemo(() => ({ favorites, toggle, has }), [favorites, toggle, has]);
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavorites(): FavCtx {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </CartProvider>
  );
}

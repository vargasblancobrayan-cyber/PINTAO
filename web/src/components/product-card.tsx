"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { useCart, useFavorites } from "./providers";

/**
 * Tarjeta de producto.
 *
 * Cambios de accesibilidad/interacción respecto a la versión anterior:
 * - El botón de favorito estaba **dentro** del `<Link>` de la tarjeta (botón
 *   anidado en un enlace: HTML inválido y foco impredecible). Ahora es hermano
 *   del enlace y se superpone con `z-10`.
 * - "Agregar rápido" sólo aparecía con `group-hover`, así que en móvil y tactil
 *   era inalcanzable. Ahora es visible por defecto y sólo se revela al pasar el
 *   cursor en pantallas grandes, manteniéndose visible con foco de teclado.
 * - La acción confirma el resultado en el propio botón ("✓ Agregado").
 */
export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const fav = useFavorites();
  const reduce = useReducedMotion();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outOfStock = product.stock <= 0;
  const isFav = fav.has(product.id);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const quickAdd = () => {
    if (outOfStock) return;
    const size = product.sizes[Math.floor(product.sizes.length / 2)] ?? product.sizes[0];
    add(product.id, size);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="group relative">
      <div className="relative overflow-hidden rounded-2xl bg-coal aspect-[4/5]">
        <Link href={`/producto/${product.id}`} className="block h-full w-full">
          <Image
            src={product.img}
            alt={product.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          {/* Velo al pasar el cursor: da profundidad y hace legible la etiqueta. */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-noir/70 px-3 py-1 text-[10px] font-display tracking-[0.2em] text-accent backdrop-blur">
          {product.tag}
        </span>

        <button
          type="button"
          onClick={() => fav.toggle(product.id)}
          aria-label={isFav ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`}
          aria-pressed={isFav}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-noir/60 backdrop-blur transition-transform hover:scale-110 active:scale-95"
        >
          <motion.svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={isFav ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={isFav ? "text-accent" : "text-cream"}
            animate={reduce || !isFav ? undefined : { scale: [1, 1.35, 1] }}
            transition={{ duration: 0.35 }}
            aria-hidden="true"
          >
            <path d="M19.8 5.1a5 5 0 0 0-7.1 0l-.7.7-.7-.7a5 5 0 0 0-7.1 7.1l7.8 7.8 7.8-7.8a5 5 0 0 0 0-7.1Z" />
          </motion.svg>
        </button>

        {outOfStock && (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-noir/85 px-3 py-1.5 text-center text-[11px] font-display tracking-[0.25em] text-cream backdrop-blur">
            AGOTADO
          </span>
        )}
      </div>

      <Link href={`/producto/${product.id}`} className="mt-3 block">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="eyebrow !tracking-[0.2em]">{product.category}</p>
            <h3 className="mt-1 font-display text-sm uppercase leading-tight">{product.name}</h3>
            <p className="mt-1 text-xs text-sand">{product.color}</p>
          </div>
          <p className="font-display text-sm text-accent">{formatCOP(product.price)}</p>
        </div>
      </Link>

      <button
        onClick={quickAdd}
        disabled={outOfStock}
        className={`mt-3 w-full rounded-lg border py-2 font-display text-[11px] tracking-[0.25em] uppercase transition-all duration-300
          hover:bg-cream hover:text-noir focus-visible:opacity-100 group-hover:opacity-100
          lg:opacity-0 ${added ? "border-accent bg-accent text-noir opacity-100" : "border-line"}
          disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label={outOfStock ? `Sin stock: ${product.name}` : `Agregar ${product.name} al carrito`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={added ? "added" : outOfStock ? "out" : "idle"}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="block"
          >
            {outOfStock ? "Sin stock" : added ? "✓ Agregado" : "Agregar rápido"}
          </motion.span>
        </AnimatePresence>
      </button>
    </article>
  );
}

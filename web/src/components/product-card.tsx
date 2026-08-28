"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { useCart, useFavorites } from "./providers";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const fav = useFavorites();

  const quickAdd = () => {
    const size = product.sizes[Math.floor(product.sizes.length / 2)] ?? product.sizes[0];
    add(product.id, size);
  };

  return (
    <article className="group relative">
      <Link href={`/producto/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-2xl bg-coal aspect-[4/5]">
          <Image
            src={product.img}
            alt={product.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <span
            className="absolute left-3 top-3 rounded-full bg-noir/70 px-3 py-1 text-[10px] font-display tracking-[0.2em] text-accent backdrop-blur"
          >
            {product.tag}
          </span>
          {product.stock <= 0 && (
            <span className="absolute inset-x-3 bottom-3 rounded-lg bg-noir/80 px-3 py-1.5 text-center text-[11px] font-display tracking-[0.25em] text-cream backdrop-blur">
              AGOTADO
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              fav.toggle(product.id);
            }}
            aria-label={fav.has(product.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-noir/60 backdrop-blur transition hover:scale-110"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={fav.has(product.id) ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              className={fav.has(product.id) ? "text-accent" : "text-cream"}
            >
              <path d="M19.8 5.1a5 5 0 0 0-7.1 0l-.7.7-.7-.7a5 5 0 0 0-7.1 7.1l7.8 7.8 7.8-7.8a5 5 0 0 0 0-7.1Z" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
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
        disabled={product.stock <= 0}
        className="mt-3 w-full rounded-lg border border-line py-2 font-display text-[11px] tracking-[0.25em] uppercase opacity-0 transition-all duration-300 hover:bg-cream hover:text-noir group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Agregar ${product.name} al carrito`}
      >
        {product.stock <= 0 ? "Sin stock" : "Agregar rápido"}
      </button>
    </article>
  );
}

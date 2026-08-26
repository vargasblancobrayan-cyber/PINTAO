"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatCOP, unitPriceWithDiscount } from "@/lib/format";
import { useCart, useFavorites } from "./providers";

export function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[Math.floor(product.sizes.length / 2)]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const fav = useFavorites();

  const variant = useMemo(
    () => product.variants.find((v) => v.size === size),
    [product, size],
  );

  const unit = unitPriceWithDiscount(product.price, qty);

  const handleAdd = () => {
    add(product.id, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-coal">
        <Image src={product.img} alt={product.name} fill priority className="object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-noir/70 px-4 py-1.5 text-xs font-display tracking-[0.2em] text-accent backdrop-blur">
          {product.tag}
        </span>
      </div>

      <div>
        <p className="eyebrow">{product.category} · {product.color}</p>
        <h1 className="display-title mt-2 text-4xl sm:text-5xl">{product.name}</h1>
        <p className="mt-4 text-cream/75">{product.description}</p>

        <div className="mt-6 flex items-baseline gap-3">
          <span className="font-display text-3xl text-accent">{formatCOP(unit)}</span>
          {qty >= 12 && (
            <span className="text-sm text-mute line-through">{formatCOP(product.price)}</span>
          )}
          <span className="text-xs text-sand">/ unidad</span>
        </div>

        <div className="mt-8">
          <p className="eyebrow mb-3">TALLA · {size}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.size}
                onClick={() => setSize(v.size)}
                className={`rounded-lg border px-4 py-2 font-display text-sm transition ${
                  size === v.size ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-cream"
                }`}
                aria-pressed={size === v.size}
              >
                {v.size}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-sand">
            {variant ? `${variant.stock} disponibles en talla ${variant.size}` : ""}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-line">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2.5 hover:text-accent" aria-label="Menos">−</button>
            <span className="min-w-10 text-center font-medium">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="px-4 py-2.5 hover:text-accent" aria-label="Más">+</button>
          </div>
          <button onClick={handleAdd} className="btn-solid flex-1 sm:flex-none" aria-live="polite">
            {added ? "✓ AGREGADO" : "AGREGAR AL CARRITO"}
          </button>
          <button
            onClick={() => fav.toggle(product.id)}
            aria-label="Favorito"
            className={`rounded-lg border p-2.5 transition ${fav.has(product.id) ? "border-accent text-accent" : "border-line text-cream"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={fav.has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M19.8 5.1a5 5 0 0 0-7.1 0l-.7.7-.7-.7a5 5 0 0 0-7.1 7.1l7.8 7.8 7.8-7.8a5 5 0 0 0 0-7.1Z" />
            </svg>
          </button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Descuento desde 12 und.", "Stock verificado", "Envío a Colombia"].map((msg) => (
            <div key={msg} className="card-surface flex items-center gap-2 p-3 text-xs text-sand">
              <span className="text-accent">✓</span> {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

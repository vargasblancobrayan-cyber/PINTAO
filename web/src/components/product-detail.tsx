"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatCOP, unitPriceWithDiscount } from "@/lib/format";
import { useCart, useFavorites } from "./providers";

export function ProductDetail({ product }: { product: Product }) {
  const gallery = product.gallery.length ? product.gallery : [product.img];
  const [activeImg, setActiveImg] = useState(0);
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
  const outOfStock = (variant?.stock ?? product.stock) === 0;

  const handleAdd = () => {
    add(product.id, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const buyNow = () => add(product.id, size, qty);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
      {/* Galería multi-imagen */}
      <div className="grid gap-3 lg:grid-cols-[72px_1fr]">
        <div className="order-2 flex gap-3 lg:order-1 lg:flex-col" role="listbox" aria-label="Galería del producto">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActiveImg(i)}
              role="option"
              aria-selected={activeImg === i}
              aria-label={`Imagen ${i + 1} de ${gallery.length}`}
              className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-coal transition lg:h-24 lg:w-full ${
                activeImg === i ? "ring-2 ring-accent" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-coal">
          <Image
            key={activeImg}
            src={gallery[activeImg]}
            alt={product.name}
            fill
            priority
            className="object-cover"
          />
          <span className="absolute left-4 top-4 rounded-full bg-noir/70 px-4 py-1.5 text-xs font-display tracking-[0.2em] text-accent backdrop-blur">
            {product.tag}
          </span>
        </div>
      </div>

      {/* Información */}
      <div>
        <p className="eyebrow">{product.category} · {product.color}</p>
        <h1 className="display-title mt-2 text-4xl sm:text-5xl">{product.name}</h1>
        <p className="mt-4 max-w-xl text-cream/75">
          {product.description} Composición y ficha técnica disponibles para compradores registrados.
        </p>

        <div className="mt-6 flex items-baseline gap-3">
          <span className="font-display text-3xl text-accent">{formatCOP(unit)}</span>
          {qty >= 12 && (
            <span className="text-sm text-mute line-through">{formatCOP(product.price)}</span>
          )}
          <span className="text-xs text-sand">/ unidad</span>
        </div>

        {/* Tallas */}
        <div className="mt-8">
          <p className="eyebrow mb-3">TALLA · {size}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const agotada = v.stock === 0;
              return (
                <button
                  key={v.size}
                  onClick={() => setSize(v.size)}
                  disabled={agotada}
                  className={`rounded-lg border px-4 py-2 font-display text-sm transition ${
                    agotada
                      ? "cursor-not-allowed border-line/50 text-mute/50 line-through"
                      : size === v.size
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line hover:border-cream"
                  }`}
                  aria-pressed={size === v.size}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-sand" aria-live="polite">
            {outOfStock
              ? "Talla agotada — prueba otra talla"
              : `${variant?.stock ?? 0} disponibles en talla ${size}`}
          </p>
        </div>

        {/* Cantidad + acciones */}
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-lg border border-line">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2.5 hover:text-accent" aria-label="Reducir cantidad">−</button>
              <span className="min-w-10 text-center font-medium" aria-live="polite">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2.5 hover:text-accent" aria-label="Aumentar cantidad">+</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fav.toggle(product.id)} aria-label="Favorito"
                className={`rounded-lg border p-2.5 transition ${fav.has(product.id) ? "border-accent text-accent" : "border-line text-cream hover:text-accent"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={fav.has(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M19.8 5.1a5 5 0 0 0-7.1 0l-.7.7-.7-.7a5 5 0 0 0-7.1 7.1l7.8 7.8 7.8-7.8a5 5 0 0 0 0-7.1Z" />
                </svg>
              </button>
              <span className="text-xs text-sand">{fav.has(product.id) ? "En favoritos" : "Guardar"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={handleAdd} disabled={outOfStock} aria-live="polite"
              className="btn-solid flex-1 disabled:cursor-not-allowed disabled:opacity-40">
              {added ? "✓ AGREGADO" : outOfStock ? "SIN STOCK" : "AGREGAR AL CARRITO"}
            </button>
            <Link href="/checkout" onClick={buyNow} aria-disabled={outOfStock}
              className={`btn-ghost flex-1 ${outOfStock ? "pointer-events-none opacity-40" : ""}`}>
              COMPRAR AHORA
            </Link>
          </div>
        </div>

        {/* Beneficios */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["−", "Descuento desde 12 und."],
            ["✓", "Stock verificado por talla"],
            ["→", "Envío a toda Colombia"],
          ].map(([icon, msg]) => (
            <div key={msg} className="card-surface flex items-center gap-2 p-3 text-xs text-sand">
              <span className="text-accent">{icon}</span> {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

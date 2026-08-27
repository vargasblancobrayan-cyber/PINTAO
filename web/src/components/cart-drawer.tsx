"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./providers";
import { products } from "@/lib/products";
import { formatCOP, unitPriceWithDiscount, volumeDiscount } from "@/lib/format";

const TIERS = [
  { qty: 12, discount: 0.08 },
  { qty: 24, discount: 0.12 },
  { qty: 48, discount: 0.18 },
];

const MAX_QTY = TIERS[TIERS.length - 1].qty;

/** Swatch de color por nombre de variante (fallback sutil si no se conoce). */
const COLOR_SWATCH: Record<string, string> = {
  Negro: "#000000",
  Azul: "#2b4a83",
  Crema: "#e8e0d2",
  Blanco: "#eef1f4",
  Índigo: "#2e3a66",
  Arena: "#d9c9a9",
};
const unknownSwatch = "linear-gradient(135deg,#555,#888)";

function DiscountProgress({ count }: { count: number }) {
  const reduce = useReducedMotion();
  const next = TIERS.find((t) => t.qty > count);
  const current = [...TIERS].reverse().find((t) => t.qty <= count);
  const pct = Math.min(count / MAX_QTY, 1);

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.14] via-ash/40 to-ash/20 px-5 pb-4 pt-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <p className="text-sm leading-snug text-sand">
          {next ? (
            <>
              Llevas <strong className="text-cream">{count}</strong> und. — con{" "}
              <strong className="text-cream">{next.qty}</strong> obtienes{" "}
              <strong className="text-accent">-{next.discount * 100}%</strong>
            </>
          ) : (
            <>
              Descuento máximo:{" "}
              <strong className="text-accent">-{Math.round((current?.discount ?? 0) * 100)}%</strong>
            </>
          )}
        </p>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold tracking-wide text-noir">
          {Math.round(volumeDiscount(count) * 100)}% OFF
        </span>
      </div>

      <div className="relative mt-3 h-6">
        <div className="absolute inset-x-0 top-1.5 h-1.5 overflow-hidden rounded-full bg-noir/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent shadow-[0_0_12px_rgba(201,162,39,0.65)]"
            initial={false}
            animate={
              reduce
                ? undefined
                : { width: `${pct * 100}%` }
            }
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
          />
        </div>
        {/* Hitos por nivel de descuento */}
        {TIERS.map((t) => {
          const reached = count >= t.qty;
          const left = (t.qty / MAX_QTY) * 100;
          return (
            <div
              key={t.qty}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <span
                className={`block h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] transition-colors ${
                  reached ? "bg-accent" : "bg-noir/70 ring-2 ring-accent/25"
                }`}
              />
              <span
                className={`absolute left-0 top-4 -translate-x-1/2 text-[9px] tracking-widest ${
                  reached ? "text-accent" : "text-mute"
                }`}
              >
                {t.qty}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] tracking-[0.18em] text-mute">
        D<span className="text-accent">+/</span> unidades mejoran el precio automáticamente
      </p>
    </div>
  );
}

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const reduce = useReducedMotion();

  const count = items.reduce((n, i) => n + i.qty, 0);
  const lines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const unit = unitPriceWithDiscount(product.price, count);
      const saved = product.price - unit;
      return { ...item, product, unit, saved };
    })
    .filter(Boolean) as Array<{
    productId: number;
    size: string;
    qty: number;
    product: (typeof products)[number];
    unit: number;
    saved: number;
  }>;

  const total = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const savings = lines.reduce((sum, l) => sum + l.saved * l.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-noir/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l-2 border-accent/40 bg-coal shadow-2xl shadow-black/60"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="Carrito de compras"
          >
            <div className="relative flex items-center justify-between gap-4 border-b border-accent/30 bg-accent/[0.06] px-7 py-6">
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-noir shadow-[0_0_18px_rgba(201,162,39,0.35)]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 22c-1.1 0-2-.9-2-2V7H3v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v4H7ZM17 4h-3V2h-4v2H7v2h10V4Zm1 4h-2v3l2 1.2V8Z" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-noir bg-cream px-1.5 text-[11px] font-bold text-noir">
                      {count}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-[0.15em] text-cream">
                    Tu pinta
                  </h2>
                  <p className="text-[11px] tracking-[0.25em] text-sand">
                    {count === 0
                      ? "carrito vacío"
                      : `${count} prenda${count !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-noir/40 text-mute transition hover:border-accent hover:bg-accent hover:text-noir"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.06]">
                  <motion.svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    className="text-accent"
                    fill="currentColor"
                    aria-hidden
                    animate={reduce ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 2.4, repeat: reduce ? 0 : Infinity, ease: "easeInOut" }}
                  >
                    <path d="M7 22c-1.1 0-2-.9-2-2V7H3v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v4H7ZM17 4h-3V2h-4v2H7v2h10V4Z" />
                  </motion.svg>
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(201,162,39,0.8)]" />
                </div>
                <div>
                  <p className="eyebrow">CARRITO VACÍO</p>
                  <p className="mt-3 text-base leading-relaxed text-sand">
                    El drop está esperando.<br />
                    Arma tu pinta completa y aprovecha<br />los descuentos por volumen.
                  </p>
                </div>
                <button onClick={() => setOpen(false)}>
                  <Link href="/tienda" className="btn-solid px-8">
                    VER EL DROP
                  </Link>
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 pt-4">
                  <DiscountProgress count={count} />
                </div>
                <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {lines.map((l) => (
                      <motion.div
                        key={`${l.productId}-${l.size}`}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ type: "spring", damping: 25 }}
                        className="group relative mb-4 flex gap-5 overflow-hidden rounded-2xl border border-line bg-ash/60 p-4 transition-colors hover:border-accent/40 hover:bg-ash"
                      >
                        <Link
                          href={`/producto/${l.productId}`}
                          onClick={() => setOpen(false)}
                          className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-noir"
                        >
                          <Image
                            src={l.product.img}
                            alt={l.product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {l.saved > 0 && (
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold tracking-wide text-noir">
                              -{Math.round((l.saved / l.product.price) * 100)}%
                            </span>
                          )}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/producto/${l.productId}`}
                                onClick={() => setOpen(false)}
                                className="font-display block truncate text-base uppercase text-cream transition-colors group-hover:text-accent"
                              >
                                {l.product.name}
                              </Link>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                <span className="rounded-md border border-line bg-noir/50 px-2 py-0.5 text-[10px] tracking-[0.18em] text-sand">
                                  {l.size}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs text-sand">
                                  <span
                                    className="h-3 w-3 rounded-full border border-line"
                                    style={{ background: COLOR_SWATCH[l.product.color] ?? unknownSwatch }}
                                    aria-hidden
                                  />
                                  {l.product.color}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => remove(l.productId, l.size)}
                              className="shrink-0 rounded-full border border-line bg-noir/70 p-2 text-mute transition-colors hover:border-danger hover:bg-danger hover:text-noir"
                              aria-label="Eliminar"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex items-center overflow-hidden rounded-xl border border-line bg-noir">
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                                className="px-3 py-1.5 text-lg text-sand transition-colors hover:bg-ash hover:text-accent"
                                aria-label="Reducir cantidad"
                              >
                                −
                              </button>
                              <span className="min-w-8 border-x border-line bg-ash/40 py-1 text-center text-base font-bold text-cream">
                                {l.qty}
                              </span>
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty + 1)}
                                className="px-3 py-1.5 text-lg text-sand transition-colors hover:bg-ash hover:text-accent"
                                aria-label="Aumentar cantidad"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg text-accent">
                                {formatCOP(l.unit * l.qty)}
                              </p>
                              {l.saved > 0 ? (
                                <p className="text-xs text-mute line-through">
                                  {formatCOP(l.product.price * l.qty)}
                                </p>
                              ) : (
                                <p className="text-[11px] text-mute">{formatCOP(l.unit)} c/u</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="border-t-2 border-accent/40 bg-gradient-to-b from-noir to-coal px-7 pt-5 pb-7">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-sand">Subtotal</span>
                    <span className="text-cream">{formatCOP(total + savings)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sand">Descuento por volumen</span>
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 font-semibold text-accent">
                        −{formatCOP(savings)}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
                    <span className="eyebrow">TOTAL</span>
                    <div className="text-right">
                      {savings > 0 && (
                        <p className="text-xs text-mute line-through">
                          {formatCOP(total + savings)}
                        </p>
                      )}
                      <span className="font-display text-3xl leading-none text-accent">
                        {formatCOP(total)}
                      </span>
                      <p className="mt-1 text-[10px] tracking-[0.18em] text-mute">
                        IVA INCLUIDO
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="btn-solid mt-5 w-full py-4 text-sm"
                  >
                    FINALIZAR COMPRA
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-3 w-full text-center text-[11px] tracking-[0.25em] text-mute transition hover:text-cream"
                  >
                    SEGUIR EXPLORANDO
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

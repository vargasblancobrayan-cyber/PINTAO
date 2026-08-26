"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./providers";
import { products } from "@/lib/products";
import { formatCOP, unitPriceWithDiscount, volumeDiscount } from "@/lib/format";

const TIERS = [
  { qty: 12, discount: 0.08 },
  { qty: 24, discount: 0.12 },
  { qty: 48, discount: 0.18 },
];

function DiscountProgress({ count }: { count: number }) {
  const next = TIERS.find((t) => t.qty > count);
  const current = [...TIERS].reverse().find((t) => t.qty <= count);
  const pct = next ? count / next.qty : 1;
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-r from-accent/15 to-accent/5 px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        {next ? (
          <span className="text-sm text-sand">
            Llevas <strong className="text-cream">{count}</strong> und. — a las{" "}
            <strong className="text-cream">{next.qty}</strong> obtienes{" "}
            <strong className="text-accent">-{next.discount * 100}%</strong>
          </span>
        ) : (
          <span className="text-sm text-sand">
            Descuento máximo activo: <strong className="text-accent">-{Math.round((current?.discount ?? 0) * 100)}%</strong>
          </span>
        )}
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-noir">
          {Math.round(volumeDiscount(count) * 100)}% OFF
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-noir/50">
        <motion.div
          className="h-full rounded-full bg-accent shadow-[0_0_10px_rgba(222,164,24,0.7)]"
          initial={false}
          animate={{ width: `${Math.min(pct * 100, 100)}%` }}
          transition={{ type: "spring", damping: 25 }}
        />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();

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
            <div className="flex items-center justify-between border-b border-accent/30 bg-accent/5 px-7 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-noir">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 22c-1.1 0-2-.9-2-2V7H3v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v4H7ZM17 4h-3V2h-4v2H7v2h10V4Zm1 4h-2v3l2 1.2V8Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-[0.15em] text-cream">
                    Tu pinta
                  </h2>
                  <p className="text-xs tracking-[0.25em] text-sand">
                    {count === 0 ? "vacío" : `${count} prenda${count !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              {count > 0 && (
                <span className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold text-noir">
                  {count}
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full border-2 border-line text-mute transition hover:border-accent hover:bg-accent hover:text-noir"
              >
                ×
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-mute" fill="currentColor" aria-hidden>
                    <path d="M7 22c-1.1 0-2-.9-2-2V7H3v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v4H7ZM17 4h-3V2h-4v2H7v2h10V4Z" />
                  </svg>
                </div>
                <div>
                  <p className="eyebrow">CARRITO VACÍO</p>
                  <p className="mt-2 text-sm text-sand">
                    El drop está esperando.<br />Arma tu pinta completa.
                  </p>
                </div>
                <button onClick={() => setOpen(false)}>
                  <Link href="/tienda" className="btn-solid">VER EL DROP</Link>
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
                        className="group mb-4 flex gap-5 rounded-2xl border-2 border-line bg-ash/60 p-4 transition-colors hover:border-accent/50 hover:bg-ash"
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
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/producto/${l.productId}`}
                                onClick={() => setOpen(false)}
                                className="font-display block truncate text-base uppercase text-cream group-hover:text-accent"
                              >
                                {l.product.name}
                              </Link>
                              <p className="mt-1 text-sm text-sand">
                                Talla {l.size} · {l.product.color}
                              </p>
                            </div>
                            <button
                              onClick={() => remove(l.productId, l.size)}
                              className="shrink-0 rounded-full bg-noir/70 p-2 text-mute transition hover:bg-danger hover:text-noir"
                              aria-label="Eliminar"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center rounded-xl border-2 border-line bg-noir">
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                                className="px-3 py-1.5 text-lg text-sand transition hover:text-accent"
                                aria-label="Menos"
                              >
                                −
                              </button>
                              <span className="min-w-8 text-center text-base font-bold text-cream">{l.qty}</span>
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty + 1)}
                                className="px-3 py-1.5 text-lg text-sand transition hover:text-accent"
                                aria-label="Más"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg text-accent">
                                {formatCOP(l.unit * l.qty)}
                              </p>
                              {l.saved > 0 && (
                                <p className="text-xs text-mute line-through">
                                  {formatCOP(l.product.price * l.qty)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="border-t-2 border-accent/40 bg-gradient-to-b from-noir to-coal px-7 py-6">
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-base">
                      <span className="text-sand">Subtotal</span>
                      <span className="text-cream">{formatCOP(total + savings)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-base">
                        <span className="text-sand">Descuento por volumen</span>
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">
                          −{formatCOP(savings)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between pt-2">
                      <span className="eyebrow">TOTAL</span>
                      <span className="font-display text-3xl text-accent">{formatCOP(total)}</span>
                    </div>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="btn-solid w-full py-4 text-base"
                  >
                    FINALIZAR COMPRA →
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-3 w-full text-center text-xs tracking-[0.25em] text-mute transition hover:text-cream"
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

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
    <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        {next ? (
          <span className="text-sand">
            Llevas <strong className="text-cream">{count}</strong> und. — a las{" "}
            <strong className="text-cream">{next.qty}</strong> obtienes{" "}
            <strong className="text-accent">-{next.discount * 100}%</strong>
          </span>
        ) : (
          <span className="text-sand">
            Descuento máximo activo: <strong className="text-accent">-{Math.round((current?.discount ?? 0) * 100)}%</strong>
          </span>
        )}
        <span className="font-display text-accent">
          {Math.round(volumeDiscount(count) * 100)}% OFF
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-ash">
        <motion.div
          className="h-full bg-accent"
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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-coal"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="Carrito de compras"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" className="text-accent" fill="currentColor" aria-hidden>
                  <path d="M7 22c-1.1 0-2-.9-2-2V7H3v13c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v4H7ZM17 4h-3V2h-4v2H7v2h10V4Zm1 4h-2v3l2 1.2V8Z" />
                </svg>
                <h2 className="font-display text-lg uppercase tracking-[0.2em]">
                  Tu pinta
                </h2>
                {count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-noir">
                    {count}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="group flex h-9 w-9 items-center justify-center rounded-full border border-line text-mute transition hover:border-accent hover:text-accent"
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
                        className="group mb-4 flex gap-4 rounded-xl border border-line bg-ash/40 p-3 transition-colors hover:border-accent/40"
                      >
                        <Link
                          href={`/producto/${l.productId}`}
                          onClick={() => setOpen(false)}
                          className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ash"
                        >
                          <Image
                            src={l.product.img}
                            alt={l.product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={`/producto/${l.productId}`}
                                onClick={() => setOpen(false)}
                                className="font-display truncate text-sm uppercase"
                              >
                                {l.product.name}
                              </Link>
                              <p className="mt-0.5 text-xs text-sand">
                                Talla {l.size} · {l.product.color}
                              </p>
                            </div>
                            <button
                              onClick={() => remove(l.productId, l.size)}
                              className="shrink-0 rounded-full p-1.5 text-mute transition hover:bg-danger/15 hover:text-danger"
                              aria-label="Eliminar"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center rounded-lg border border-line bg-noir/50">
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                                className="px-2.5 py-1 text-sand transition hover:text-accent"
                                aria-label="Menos"
                              >
                                −
                              </button>
                              <span className="min-w-6 text-center text-sm font-semibold">{l.qty}</span>
                              <button
                                onClick={() => setQty(l.productId, l.size, l.qty + 1)}
                                className="px-2.5 py-1 text-sand transition hover:text-accent"
                                aria-label="Más"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-sm text-accent">
                                {formatCOP(l.unit * l.qty)}
                              </p>
                              {l.saved > 0 && (
                                <p className="text-[10px] text-mute line-through">
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
                <div className="border-t border-line bg-noir/40 px-6 py-5">
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sand">Subtotal</span>
                      <span className="text-cream">{formatCOP(total + savings)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-sand">Descuento por volumen</span>
                        <span className="font-semibold text-accent">−{formatCOP(savings)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="eyebrow">TOTAL</span>
                      <span className="font-display text-2xl text-accent">{formatCOP(total)}</span>
                    </div>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="btn-solid w-full"
                  >
                    FINALIZAR COMPRA →
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-2.5 w-full text-center text-[11px] tracking-[0.2em] text-mute transition hover:text-cream"
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "./providers";
import { products } from "@/lib/products";
import { formatCOP, unitPriceWithDiscount } from "@/lib/format";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();

  const lines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const unit = unitPriceWithDiscount(
        product.price,
        items.reduce((n, i) => n + i.qty, 0),
      );
      return { ...item, product, unit };
    })
    .filter(Boolean) as Array<{
    productId: number;
    size: string;
    qty: number;
    product: (typeof products)[number];
    unit: number;
  }>;

  const total = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);

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
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-lg uppercase tracking-[0.2em]">
                Carrito <span className="text-accent">({count})</span>
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar carrito" className="text-2xl leading-none hover:text-accent">
                ×
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="eyebrow">TU CARRITO ESTÁ VACÍO</p>
                <p className="text-sm text-sand">El drop está esperando. Arma tu pinta.</p>
                <button onClick={() => setOpen(false)} className="btn-solid">
                  <Link href="/tienda">VER TIENDA</Link>
                </button>
              </div>
            ) : (
              <>
                <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-4">
                  {lines.map((l) => (
                    <div key={`${l.productId}-${l.size}`} className="mb-4 flex gap-4 rounded-xl border border-line bg-ash/40 p-3">
                      <div className="relative h-24 w-20 overflow-hidden rounded-lg bg-ash">
                        <Image src={l.product.img} alt={l.product.name} fill className="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <Link href={`/producto/${l.productId}`} onClick={() => setOpen(false)} className="font-display text-sm uppercase">
                            {l.product.name}
                          </Link>
                          <p className="text-xs text-sand">
                            Talla {l.size} · {l.product.color}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 rounded-lg border border-line">
                            <button onClick={() => setQty(l.productId, l.size, l.qty - 1)} className="px-3 py-1 hover:text-accent" aria-label="Menos">−</button>
                            <span className="text-sm font-medium">{l.qty}</span>
                            <button onClick={() => setQty(l.productId, l.size, l.qty + 1)} className="px-3 py-1 hover:text-accent" aria-label="Más">+</button>
                          </div>
                          <p className="font-display text-sm text-accent">{formatCOP(l.unit * l.qty)}</p>
                        </div>
                      </div>
                      <button onClick={() => remove(l.productId, l.size)} className="self-start text-mute hover:text-danger" aria-label="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line px-6 py-5">
                  <p className="mb-1 text-xs text-sand">
                    Descuento por volumen aplicado desde 12 unidades.
                  </p>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="eyebrow">TOTAL</span>
                    <span className="font-display text-xl text-accent">{formatCOP(total)}</span>
                  </div>
                  <Link href="/checkout" onClick={() => setOpen(false)} className="btn-solid w-full">
                    FINALIZAR COMPRA
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

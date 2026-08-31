"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Order, Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { products } from "@/lib/products";

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Cancelado" ? "text-danger bg-danger/10 border-danger/30" :
    status === "Completado" || status === "Pagado" ? "text-accent-soft bg-accent/10 border-accent/30" :
    status === "Enviado" ? "text-cream bg-cream/10 border-cream/30" :
    "text-sand bg-sand/10 border-sand/30";
  return (
    <span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-display tracking-[0.15em] uppercase ${tone}`}>
      {status}
    </span>
  );
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="mt-4 grid gap-6 border-t border-line pt-4 lg:grid-cols-2">
      <div>
        <p className="eyebrow mb-3">PRODUCTOS</p>
        <ul className="space-y-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-cream">{item.name}</span>
              <span className="text-sand">
                {item.size} · ×{item.qty} · {formatCOP(item.unitPrice * item.qty)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3 text-sm">
        <p className="eyebrow mb-1">RESUMEN</p>
        <div className="space-y-1 text-xs">
          <p className="flex justify-between gap-4"><span className="text-sand">Subtotal</span><span>{formatCOP(order.subtotal)}</span></p>
          {order.volumeDiscount > 0 && (
            <p className="flex justify-between gap-4"><span className="text-sand">Descuento volumen</span><span className="text-accent">-{formatCOP(order.volumeDiscount)}</span></p>
          )}
          {order.coupon && (
            <p className="flex justify-between gap-4"><span className="text-sand">Cupón {order.coupon}</span><span className="text-accent">-{formatCOP(order.couponDiscount)}</span></p>
          )}
          <p className="flex justify-between gap-4"><span className="text-sand">Envío</span><span>{order.shipping ? formatCOP(order.shipping) : "Gratis"}</span></p>
        </div>
        <p className="flex justify-between gap-4 border-t border-line pt-2 font-display text-base text-accent">
          <span>Total</span><span>{formatCOP(order.total)}</span>
        </p>
        <p className="text-xs text-sand">
          {order.paymentMethod} · {order.shippingMethod}
          {order.address && <> · {order.address.line1}, {order.address.city}, {order.address.region}</>}
        </p>
      </div>
    </div>
  );
}

function FavoriteProduct({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="card-surface group flex items-center gap-4 p-4 transition-colors hover:border-accent/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */ }
      <img src={product.img} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm">{product.name}</p>
        <p className="text-xs text-sand">{product.category} · {formatCOP(product.price)}</p>
      </div>
      <span className="font-display text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">VER →</span>
    </Link>
  );
}

export function AccountPanel() {
  const [data, setData] = useState<{ name: string; email: string; role: string } | null>(null);


  const [orders, setOrders] = useState<Order[]>([]);
   const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
   const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (!active) return;
        setData(d.user);
        if (d.user) {
          fetch("/api/orders")
            .then((r) => (r.ok ? r.json() : { orders: [] }))
            .then((o) => { if (active) setOrders(o.orders ?? []); });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pintao-favs");
      if (raw) setFavoriteIds(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);



  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));



  if (loading) {
    return <div className="card-surface p-8 text-center text-sand">Cargando tu cuenta…</div>;
  }



  if (!data) {
    return (
      <div className="card-surface flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-display text-xl uppercase">Sin sesión activa</p>
        <p className="max-w-sm text-sm text-sand">Entra con tu correo para ver tu historial y favoritos.</p>
        <Link href="/acceso" className="btn-solid">IR A ACCESO</Link>
      </div>
    );
  }



  return (
    <div className="space-y-8">
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-8">
        <div>
          <p className="eyebrow mb-1">BIENVENIDO</p>
          <h2 className="font-display text-2xl uppercase">{data.name}</h2>
          <p className="text-sm text-sand">{data.email}</p>
        </div>
        <button
          className="btn-ghost"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            location.reload();
          }}
        >
          CERRAR SESIÓN
        </button>
      </div>

      {favoriteProducts.length > 0 && (
        <div>
          <p className="eyebrow mb-4">TUS FAVORITOS</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {favoriteProducts.map((p) => (
              <FavoriteProduct key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-4">HISTORIAL DE PEDIDOS ({orders.length})</p>
        {orders.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-sand">
            Aún no tienes pedidos. El drop te espera.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="card-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm">#{o.id}</p>
                    <p className="text-xs text-sand">
                      {new Date(o.createdAt).toLocaleDateString("es-CO")} · {o.items.reduce((n, i) => n + i.qty, 0)} prendas
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-accent">{formatCOP(o.total)}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <button
                      onClick={() => setExpanded((v) => (v === o.id ? null : o.id))}
                      className="rounded-full border border-line px-3 py-1 text-xs font-display tracking-[0.15em] hover:border-accent transition-colors"
                      aria-expanded={expanded === o.id}
                    >
                      {expanded === o.id ? "OCULTAR" : "VER DETALLE"}
                    </button>
                  </div>
                </div>
                {expanded === o.id && <OrderDetail order={o} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

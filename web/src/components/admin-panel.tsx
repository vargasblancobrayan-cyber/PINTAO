"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCOP } from "@/lib/format";
import type { Order, Quote } from "@/lib/types";

interface Stats {
  products: number;
  stock: number;
  orders: Order[];
  quotes: Quote[];
  revenue: number;
}

const ORDER_STATUSES = ["Pendiente de confirmación", "Pagado", "Enviado", "Completado", "Cancelado"];

type View = "resumen" | "pedidos" | "productos" | "cotizaciones";

const VIEWS: { id: View; label: string }[] = [
  { id: "resumen", label: "RESUMEN" },
  { id: "pedidos", label: "PEDIDOS" },
  { id: "productos", label: "PRODUCTOS" },
  { id: "cotizaciones", label: "COTIZACIONES" },
];

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
          {order.customer.phone} · {order.paymentMethod}
          {order.address && <> · {order.address.line1}, {order.address.city}</>}
        </p>
      </div>
    </div>
  );
}

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(status: string) {
    setSaving(true);
    setError(null);
    try {
      await onStatusChange(order.id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos actualizar el estado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-sm">#{order.id} · {order.customer.name}</p>
          <p className="text-xs text-sand">
            {new Date(order.createdAt).toLocaleDateString("es-CO")} · {order.items.reduce((n, i) => n + i.qty, 0)} prendas · {order.customer.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-accent">{formatCOP(order.total)}</p>
          <StatusBadge status={order.status} />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-line px-3 py-1 text-xs font-display tracking-[0.15em] hover:border-accent transition-colors"
            aria-expanded={open}
          >
            {open ? "OCULTAR" : "VER DETALLE"}
          </button>
        </div>
      </div>
      {open && <OrderDetail order={order} />}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="eyebrow text-[10px]">CAMBIAR ESTADO:</span>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            disabled={saving || status === order.status}
            onClick={() => changeStatus(status)}
            className={`rounded-full border px-3 py-1 text-[11px] font-display tracking-[0.1em] uppercase transition-colors disabled:opacity-40 ${status === order.status ? "border-accent bg-accent/15 text-accent" : "border-line text-sand hover:border-accent hover:text-cream"}`}
          >
            {status}
          </button>
        ))}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}

export function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [denied, setDenied] = useState(false);
  const [view, setView] = useState<View>("resumen");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) { setDenied(true); return; }
    setStats(await res.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function changeOrderStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No pudimos actualizar el estado.");
    }
    await refresh();
  }

  const customers = useMemo(() => {
    if (!stats) return [];
    const map = new Map<string, { name: string; email: string; phone: string; orders: number; total: number; last: string }>();
    for (const o of stats.orders) {
      const email = o.customer.email.toLowerCase();
      const prev = map.get(email) ?? { name: o.customer.name, email, phone: o.customer.phone, orders: 0, total: 0, last: o.createdAt };
      prev.orders += 1;
      prev.total += o.total;
      if (o.createdAt > prev.last) prev.last = o.createdAt;
      map.set(email, prev);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [stats]);


  const pendingCount = stats?.orders.filter((o) => o.status === "Pendiente de confirmación").length ?? 0;

  if (denied) {
    return (
      <div className="card-surface p-10 text-center">
        <p className="text-sm text-sand">Sesión administrativa requerida.</p>
        <Link href="/admin/login" className="btn-solid mt-4">IR AL LOGIN</Link>
      </div>
    );
  }

  if (!stats) {
    return <div className="card-surface p-10 text-center text-sand">Cargando el panel…</div>;
  }

  const cards = [
    { label: "Productos activos", value: String(stats.products), sub: undefined },
    { label: "Unidades en inventario", value: stats.stock.toLocaleString("es-CO"), sub: undefined },
    { label: "Pedidos", value: String(stats.orders.length), sub: pendingCount ? `${pendingCount} pendientes` : undefined },
    { label: "Ingresos registrados", value: formatCOP(stats.revenue), sub: "Total confirmado" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-full border px-4 py-2 text-xs font-display tracking-[0.2em] uppercase transition-colors ${view === v.id ? "border-accent bg-accent/15 text-accent" : "border-line text-sand hover:border-accent"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={async () => { setBusy(true); await refresh(); setBusy(false); }}
          disabled={busy}
          className="rounded-full border border-line px-4 py-2 text-xs font-display tracking-[0.2em] text-sand hover:border-cream disabled:opacity-50 transition-colors"
        >
          {busy ? "ACTUALIZANDO…" : "↻ ACTUALIZAR"}
        </button>
      </div>

      {view === "resumen" && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="card-surface p-6">
                <p className="eyebrow">{c.label}</p>
                <p className="mt-2 font-display text-2xl text-accent">{c.value}</p>
                {c.sub && <p className="mt-1 text-xs text-sand">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="eyebrow mb-4">PEDIDOS RECIENTES</h2>
              {stats.orders.length === 0 ? (
                <div className="card-surface p-6 text-sm text-sand">Sin pedidos registrados aún.</div>
              ) : (
                <div className="space-y-3">
                  {stats.orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
                      <div>
                        <p className="font-display text-sm">#{o.id} · {o.customer.name}</p>
                        <p className="text-xs text-sand">
                          {o.items.reduce((n, i) => n + i.qty, 0)} prendas · {new Date(o.createdAt).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-display text-accent">{formatCOP(o.total)}</p>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="eyebrow mb-4">CLIENTES</h2>
              {customers.length === 0 ? (
                <div className="card-surface p-6 text-sm text-sand">Sin clientes aún.</div>
              ) : (
                <div className="space-y-3">
                  {customers.slice(0, 5).map((c) => (
                    <div key={c.email} className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
                      <div className="min-w-0">
                        <p className="font-display text-sm">{c.name}</p>
                        <p className="truncate text-xs text-sand">{c.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-accent">{formatCOP(c.total)}</p>
                        <p className="text-xs text-sand">{c.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section>
            <h2 className="eyebrow mb-4">COTIZACIONES MAYORISTAS</h2>
            {stats.quotes.length === 0 ? (
              <div className="card-surface p-6 text-sm text-sand">Sin cotizaciones nuevas.</div>
            ) : (
              <div className="space-y-3">
                {stats.quotes.map((q) => (
                  <div key={q.id} className="card-surface p-5">
                    <p className="font-display text-sm">#{q.id} · {q.name}</p>
                    <p className="text-xs text-sand">{q.quantity} · {q.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {view === "pedidos" && (
        <section>
          <h2 className="eyebrow mb-4">TODOS LOS PEDIDOS ({stats.orders.length})</h2>
          {stats.orders.length === 0 ? (
            <div className="card-surface p-8 text-center text-sm text-sand">Aún no hay pedidos. El drop te espera.</div>
          ) : (
            <div className="space-y-4">
              {stats.orders.map((o) => (
                <OrderCard key={o.id} order={o} onStatusChange={changeOrderStatus} />
              ))}
            </div>
          )}
        </section>
      )}

      {view === "productos" && (
        <section>
          <h2 className="eyebrow mb-4">PRODUCTOS ({stats.products})</h2>
          <p className="mb-6 text-sm text-sand">
            Inventario total: {stats.stock.toLocaleString("es-CO")} unidades. La gestión fina de catálogo (precios, tallas, galería) se hace en código en `web/src/lib/products.ts`.
          </p>
          <div className="card-surface p-6 text-sm text-sand">
            El catálogo actual es estático por diseño (roadmap: edición desde Supabase). Los pedidos descuentan stock atómicamente vía `decrement_stock`.
          </div>
        </section>
      )}

      {view === "cotizaciones" && (
        <section>
          <h2 className="eyebrow mb-4">COTIZACIONES MAYORISTAS ({stats.quotes.length})</h2>
          {stats.quotes.length === 0 ? (
            <div className="card-surface p-8 text-center text-sm text-sand">Sin cotizaciones nuevas.</div>
          ) : (
            <div className="space-y-3">
              {stats.quotes.map((q) => (
                <div key={q.id} className="card-surface p-5">
                  <p className="font-display text-sm">#{q.id} · {q.name} · <a className="text-accent" href={`tel:${q.phone}`}>{q.phone}</a></p>
                  <p className="mt-1 text-xs text-sand">
                    {new Date(q.createdAt).toLocaleString("es-CO")} · Cantidad: {q.quantity || "—"}
                  </p>
                  {q.message && <p className="mt-2 text-sm text-cream">{q.message}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <button
        className="btn-ghost"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          location.href = "/acceso";
        }}
      >
        CERRAR SESIÓN ADMIN
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

export function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setStats(d) : setDenied(true)));
  }, []);

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
    { label: "Productos activos", value: String(stats.products) },
    { label: "Unidades en inventario", value: stats.stock.toLocaleString("es-CO") },
    { label: "Pedidos", value: String(stats.orders.length) },
    { label: "Ingresos registrados", value: formatCOP(stats.revenue) },
  ];

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-surface p-6">
            <p className="eyebrow">{c.label}</p>
            <p className="mt-2 font-display text-2xl text-accent">{c.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="eyebrow mb-4">PEDIDOS RECIENTES</h2>
        {stats.orders.length === 0 ? (
          <div className="card-surface p-6 text-sm text-sand">Sin pedidos registrados aún.</div>
        ) : (
          <div className="space-y-3">
            {stats.orders.map((o) => (
              <div key={o.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-display text-sm">#{o.id} · {o.customer.name}</p>
                  <p className="text-xs text-sand">
                    {o.items.reduce((n, i) => n + i.qty, 0)} prendas · {new Date(o.createdAt).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <p className="font-display text-accent">{formatCOP(o.total)}</p>
                <span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

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

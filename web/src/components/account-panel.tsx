"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { formatCOP } from "@/lib/format";

export function AccountPanel() {
  const [data, setData] = useState<{ name: string; email: string; role: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        setData(d.user);
        if (d.user) {
          fetch("/api/orders")
            .then((r) => (r.ok ? r.json() : { orders: [] }))
            .then((o) => setOrders(o.orders ?? []));
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

      <div>
        <p className="eyebrow mb-4">HISTORIAL DE PEDIDOS</p>
        {orders.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-sand">
            Aún no tienes pedidos. El drop te espera.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-display text-sm">#{o.id}</p>
                  <p className="text-xs text-sand">
                    {new Date(o.createdAt).toLocaleDateString("es-CO")} · {o.items.reduce((n, i) => n + i.qty, 0)} prendas
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-accent">{formatCOP(o.total)}</p>
                  <p className="text-xs text-sand">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

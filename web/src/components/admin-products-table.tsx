"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";

type Row = { price: string; stock: string };
type RowState = Record<number, Row>;

const LOW_STOCK = 5;

/**
 * Inventario del panel administrativo.
 *
 * La pestaña «PRODUCTOS» era un texto de relleno ("Ver listado completo en la
 * vista de productos") aunque la API (`/api/admin/products`) ya existía con GET,
 * PUT y DELETE. Aquí se conecta de verdad: buscar, ajustar precio y stock,
 * activar/desactivar y dar de baja referencias.
 */
export function AdminProductsTable() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [rows, setRows] = useState<RowState>({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/products");
    if (!res.ok) {
      setError("No pudimos cargar el catálogo. Vuelve a iniciar sesión como administrador.");
      setProducts([]);
      return;
    }
    const data = await res.json();
    const list: Product[] = data.products ?? [];
    setProducts(list);
    setRows(
      Object.fromEntries(list.map((p) => [p.id, { price: String(p.price), stock: String(p.stock) }])),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((p) => `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(q))
      : products;
    return [...list].sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  }, [products, query]);

  const totals = useMemo(() => {
    if (!products) return { units: 0, low: 0, inactive: 0 };
    return {
      units: products.reduce((sum, p) => sum + p.stock, 0),
      low: products.filter((p) => p.stock <= LOW_STOCK).length,
      inactive: products.filter((p) => !p.active).length,
    };
  }, [products]);

  async function save(id: number) {
    const row = rows[id];
    if (!row) return;
    setSaving(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price: Number(row.price), stock: Number(row.stock) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos guardar los cambios.");
        return;
      }
      setNotice(`${data.product?.name ?? "Producto"} actualizado.`);
      await load();
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(product: Product) {
    setSaving(product.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, active: !product.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No pudimos cambiar la visibilidad.");
        return;
      }
      setNotice(product.active ? `${product.name} salió de la tienda.` : `${product.name} ya está en la tienda.`);
      await load();
    } finally {
      setSaving(null);
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`¿Dar de baja "${product.name}"? Dejará de aparecer en la tienda.`)) return;
    setSaving(product.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No pudimos dar de baja el producto.");
        return;
      }
      setNotice(`${product.name} dado de baja.`);
      await load();
    } finally {
      setSaving(null);
    }
  }

  if (products === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="eyebrow mb-2">INVENTARIO ({products.length})</h2>
          <p className="text-xs text-mute">
            {totals.units.toLocaleString("es-CO")} unidades · {totals.low} con stock bajo (≤{LOW_STOCK})
            {totals.inactive > 0 && ` · ${totals.inactive} fuera de la tienda`}
          </p>
        </div>
        <input
          className="field max-w-xs"
          placeholder="Buscar por nombre, categoría o color"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar productos"
          type="search"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" aria-live="polite" className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          {notice}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm text-sand">
          Ningún producto coincide con la búsqueda.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const row = rows[p.id] ?? { price: String(p.price), stock: String(p.stock) };
            const dirty = Number(row.price) !== p.price || Number(row.stock) !== p.stock;
            return (
              <div
                key={p.id}
                className={`card-surface flex flex-wrap items-center gap-4 p-4 ${p.active ? "" : "opacity-60"}`}
              >
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ash">
                  <Image src={p.img} alt="" fill sizes="56px" className="object-cover" />
                </div>

                <div className="min-w-[180px] flex-1">
                  <p className="font-display text-sm uppercase leading-tight">{p.name}</p>
                  <p className="text-xs text-sand">
                    {p.category} · {p.color} · {p.variants.length} tallas
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-mute">
                    <Link href={`/producto/${p.id}`} className="underline transition hover:text-cream">
                      Ver ficha
                    </Link>
                    {p.stock <= LOW_STOCK && <span className="text-danger">· stock bajo</span>}
                    {!p.active && <span>· fuera de la tienda</span>}
                  </p>
                </div>

                <label className="text-[11px] text-sand">
                  PRECIO
                  <input
                    className="field mt-1 w-28 !py-1.5 text-xs"
                    inputMode="numeric"
                    value={row.price}
                    onChange={(e) => setRows((r) => ({ ...r, [p.id]: { ...row, price: e.target.value } }))}
                    aria-label={`Precio de ${p.name}`}
                  />
                </label>

                <label className="text-[11px] text-sand">
                  STOCK
                  <input
                    className="field mt-1 w-20 !py-1.5 text-xs"
                    inputMode="numeric"
                    value={row.stock}
                    onChange={(e) => setRows((r) => ({ ...r, [p.id]: { ...row, stock: e.target.value } }))}
                    aria-label={`Stock de ${p.name}`}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => save(p.id)}
                    disabled={!dirty || saving === p.id}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-display text-[11px] tracking-widest text-accent transition hover:bg-accent hover:text-noir disabled:opacity-40"
                  >
                    {saving === p.id ? "…" : "GUARDAR"}
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    disabled={saving === p.id}
                    className="rounded-lg border border-line px-3 py-2 font-display text-[11px] tracking-widest text-sand transition hover:border-cream hover:text-cream disabled:opacity-40"
                  >
                    {p.active ? "OCULTAR" : "PUBLICAR"}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={saving === p.id}
                    aria-label={`Dar de baja ${p.name}`}
                    className="rounded-lg border border-line p-2 text-mute transition hover:border-danger hover:bg-danger hover:text-noir disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                    </svg>
                  </button>
                </div>

                {dirty && (
                  <p className="w-full text-[11px] text-accent/80">
                    Cambios sin guardar · precio {formatCOP(Number(row.price) || 0)} · stock{" "}
                    {Number(row.stock) || 0}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-mute">
        Estos cambios viven en la memoria del servidor: se aplican de inmediato a la tienda de este
        proceso y se pierden al reiniciar. La persistencia definitiva del catálogo es la tabla
        `pintao_store` de Supabase (pendiente de credenciales).
      </p>
    </section>
  );
}

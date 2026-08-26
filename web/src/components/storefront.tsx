"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

interface Filters {
  query: string;
  category: string;
  color: string;
  size: string;
  sort: string;
  minPrice: number;
  maxPrice: number;
}

function match(p: Product, f: Filters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const hay = `${p.name} ${p.category} ${p.color} ${p.tag}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.category && p.category !== f.category) return false;
  if (f.color && p.color !== f.color) return false;
  if (f.size && !p.sizes.includes(f.size)) return false;
  if (p.price < f.minPrice || p.price > f.maxPrice) return false;
  return true;
}

function sortProducts(list: Product[], sort: string): Product[] {
  const l = [...list];
  switch (sort) {
    case "precio-asc":
      return l.sort((a, b) => a.price - b.price);
    case "precio-desc":
      return l.sort((a, b) => b.price - a.price);
    case "nuevos":
      return l.sort((a, b) => (a.tag === "NUEVO" ? -1 : 1) - (b.tag === "NUEVO" ? -1 : 1));
    default:
      return l.sort((a, b) => a.id - b.id);
  }
}

export function Storefront({
  products,
  categories,
  colors,
  sizes,
  initialCategory,
  initialSort,
}: {
  products: Product[];
  categories: string[];
  colors: string[];
  sizes: string[];
  initialCategory?: string;
  initialSort?: string;
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    category: initialCategory ?? "",
    color: "",
    size: "",
    sort: initialSort ?? "relevance",
    minPrice: 0,
    maxPrice: 200000,
  });

  const results = useMemo(
    () => sortProducts(products.filter((p) => match(p, filters)), filters.sort),
    [products, filters],
  );

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
      {/* Filtros dinámicos */}
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" aria-label="Filtros">
        <div>
          <label htmlFor="q" className="eyebrow mb-2 block">BÚSQUEDA</label>
          <input
            id="q"
            className="field"
            placeholder="Nombre, color, talla…"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </div>
        <div>
          <label className="eyebrow mb-2 block">CATEGORÍA</label>
          <select
            className="field"
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="eyebrow mb-2 block">COLOR</label>
          <select className="field" value={filters.color} onChange={(e) => update({ color: e.target.value })}>
            <option value="">Todos</option>
            {colors.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="eyebrow mb-2 block">TALLA</label>
          <select className="field" value={filters.size} onChange={(e) => update({ size: e.target.value })}>
            <option value="">Todas</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="eyebrow mb-2 block">PRECIO MÁX · {filters.maxPrice.toLocaleString("es-CO")}</label>
          <input
            type="range"
            min={20000}
            max={200000}
            step={5000}
            value={filters.maxPrice}
            onChange={(e) => update({ maxPrice: Number(e.target.value) })}
            className="w-full accent-[#c9a227]"
            aria-label="Precio máximo"
          />
        </div>
        <div>
          <label className="eyebrow mb-2 block">ORDEN</label>
          <select className="field" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="relevance">Relevancia</option>
            <option value="nuevos">Lo nuevo</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </aside>

      {/* Resultados */}
      <div>
        <p className="mb-6 eyebrow" aria-live="polite">
          {results.length} {results.length === 1 ? "PRENDA" : "PRENDAS"}
        </p>
        {results.length === 0 ? (
          <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
            <p className="font-display text-xl uppercase">Sin resultados</p>
            <p className="max-w-sm text-sm text-sand">
              Ajusta los filtros o busca otra vibra. El drop está lleno de opciones.
            </p>
            <button className="btn-solid mt-2" onClick={() => setFilters({ query: "", category: "", color: "", size: "", sort: "relevance", minPrice: 0, maxPrice: 200000 })}>
              LIMPIAR FILTROS
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

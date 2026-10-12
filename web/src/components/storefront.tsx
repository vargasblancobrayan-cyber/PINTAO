"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { ProductCard } from "./product-card";

interface Filters {
  query: string;
  category: string;
  color: string;
  size: string;
  availability: "" | "in" | "out";
  sort: string;
  maxPrice: number;
}

const MIN_PRICE = 20000;
const MAX_PRICE = 200000;

const DEFAULT_FILTERS: Filters = {
  query: "",
  category: "",
  color: "",
  size: "",
  availability: "",
  sort: "relevance",
  maxPrice: MAX_PRICE,
};

function match(p: Product, f: Filters): boolean {
  const q = f.query.trim().toLowerCase();
  if (q) {
    const hay = `${p.name} ${p.category} ${p.color} ${p.tag}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.category && p.category !== f.category) return false;
  if (f.color && p.color !== f.color) return false;
  if (f.size && !p.sizes.includes(f.size)) return false;
  if (p.price > f.maxPrice) return false;
  if (f.availability === "in" && p.stock <= 0) return false;
  if (f.availability === "out" && p.stock > 0) return false;
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
      return l.sort((a, b) => (b.tag === "NUEVO" ? 1 : 0) - (a.tag === "NUEVO" ? 1 : 0));
    default:
      return l.sort((a, b) => a.id - b.id);
  }
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] tracking-wide text-accent transition-colors hover:bg-accent hover:text-noir"
    >
      {label}
      <span aria-hidden="true">×</span>
      <span className="sr-only">Quitar filtro</span>
    </button>
  );
}

/**
 * Catálogo con filtros.
 *
 * El filtrado es local e inmediato (22 referencias): antes cada cambio esperaba
 * 280 ms y mostraba un skeleton falso, así que escribir en el buscador se sentía
 * roto sin motivo. En móvil los filtros viven en un panel plegable y el estado
 * se refleja en la URL para poder compartir o recargar una búsqueda.
 */
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
    ...DEFAULT_FILTERS,
    category: initialCategory ?? "",
    sort: initialSort ?? "relevance",
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const reduce = useReducedMotion();

  const results = useMemo(
    () => sortProducts(products.filter((p) => match(p, filters)), filters.sort),
    [products, filters],
  );

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const reset = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), []);

  // Estado compartible sin disparar re-render de RSC: sólo la query string.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.category) params.set("categoria", filters.category);
    if (filters.color) params.set("color", filters.color);
    if (filters.size) params.set("talla", filters.size);
    if (filters.availability) params.set("disponibilidad", filters.availability);
    if (filters.sort !== "relevance") params.set("orden", filters.sort);
    if (filters.maxPrice !== MAX_PRICE) params.set("precioMax", String(filters.maxPrice));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.color ? 1 : 0) +
    (filters.size ? 1 : 0) +
    (filters.availability ? 1 : 0) +
    (filters.maxPrice !== MAX_PRICE ? 1 : 0) +
    (filters.query ? 1 : 0);

  /*
   * Los filtros se renderizan dos veces: en la columna fija de escritorio y en el
   * panel plegable móvil. Se prefijan los `id` para no duplicar identificadores
   * (dos nodos con el mismo id rompen `label htmlFor` y el foco por teclado).
   */
  const renderFields = (prefix: string) => (
    <>
      <div>
        <label htmlFor={`${prefix}-q`} className="eyebrow mb-2 block">
          BÚSQUEDA
        </label>
        <input
          id={`${prefix}-q`}
          type="search"
          className="field"
          placeholder="Nombre, color, talla…"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-categoria`} className="eyebrow mb-2 block">
          CATEGORÍA
        </label>
        <select
          id={`${prefix}-categoria`}
          className="field"
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-color`} className="eyebrow mb-2 block">
          COLOR
        </label>
        <select
          id={`${prefix}-color`}
          className="field"
          value={filters.color}
          onChange={(e) => update({ color: e.target.value })}
        >
          <option value="">Todos</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-talla`} className="eyebrow mb-2 block">
          TALLA
        </label>
        <select
          id={`${prefix}-talla`}
          className="field"
          value={filters.size}
          onChange={(e) => update({ size: e.target.value })}
        >
          <option value="">Todas</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-disp`} className="eyebrow mb-2 block">
          DISPONIBILIDAD
        </label>
        <select
          id={`${prefix}-disp`}
          className="field"
          value={filters.availability}
          onChange={(e) => update({ availability: e.target.value as Filters["availability"] })}
        >
          <option value="">Todas</option>
          <option value="in">En stock</option>
          <option value="out">Agotado</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-precio`} className="eyebrow mb-2 block">
          PRECIO MÁX · {formatCOP(filters.maxPrice)}
        </label>
        <input
          id={`${prefix}-precio`}
          type="range"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={5000}
          value={filters.maxPrice}
          onChange={(e) => update({ maxPrice: Number(e.target.value) })}
          className="w-full accent-[#c9a227]"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-orden`} className="eyebrow mb-2 block">
          ORDEN
        </label>
        <select
          id={`${prefix}-orden`}
          className="field"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
        >
          <option value="relevance">Relevancia</option>
          <option value="nuevos">Lo nuevo</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
        </select>
      </div>
    </>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
      {/* Filtros: panel plegable en móvil, columna fija en escritorio. */}
      <div>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 font-display text-xs tracking-[0.2em] lg:hidden"
          aria-expanded={panelOpen}
          aria-controls="panel-filtros"
        >
          <span>
            FILTROS
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-noir">{activeCount}</span>
            )}
          </span>
          <span aria-hidden="true" className={`transition-transform ${panelOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.aside
              id="panel-filtros"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden lg:hidden"
              aria-label="Filtros"
            >
              <div className="mt-5 space-y-6">{renderFields("m")}</div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Columna fija de escritorio */}
        <aside
          className="mt-6 hidden space-y-6 lg:sticky lg:top-24 lg:mt-0 lg:block lg:self-start"
          aria-label="Filtros"
        >
          {renderFields("d")}
        </aside>
      </div>

      {/* Resultados */}
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="eyebrow" aria-live="polite">
            {results.length} {results.length === 1 ? "PRENDA" : "PRENDAS"}
            {filters.availability !== "out" && (
              <span className="ml-3 text-mute">· {products.filter((p) => p.stock > 0).length} en stock</span>
            )}
          </p>
          {activeCount > 0 && (
            <button onClick={reset} className="text-[11px] tracking-[0.2em] text-mute underline transition hover:text-cream">
              LIMPIAR ({activeCount})
            </button>
          )}
        </div>

        {(filters.category || filters.color || filters.size || filters.availability || filters.query || filters.maxPrice !== MAX_PRICE) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {filters.query && <Chip label={`"${filters.query}"`} onRemove={() => update({ query: "" })} />}
            {filters.category && <Chip label={filters.category} onRemove={() => update({ category: "" })} />}
            {filters.color && <Chip label={filters.color} onRemove={() => update({ color: "" })} />}
            {filters.size && <Chip label={`Talla ${filters.size}`} onRemove={() => update({ size: "" })} />}
            {filters.availability && (
              <Chip
                label={filters.availability === "in" ? "En stock" : "Agotado"}
                onRemove={() => update({ availability: "" })}
              />
            )}
            {filters.maxPrice !== MAX_PRICE && (
              <Chip label={`Hasta ${formatCOP(filters.maxPrice)}`} onRemove={() => update({ maxPrice: MAX_PRICE })} />
            )}
          </div>
        )}

        {results.length === 0 ? (
          <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
            <p className="font-display text-xl uppercase">Sin resultados</p>
            <p className="max-w-sm text-sm text-sand">
              Ajusta los filtros o busca otra vibra. El drop está lleno de opciones.
            </p>
            <button className="btn-solid mt-2" onClick={reset}>
              LIMPIAR FILTROS
            </button>
          </div>
        ) : (
          <motion.div
            layout={!reduce}
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3"
            role="list"
          >
            {results.map((p, i) => (
              <motion.div
                key={p.id}
                role="listitem"
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(i, 8) * 0.03 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

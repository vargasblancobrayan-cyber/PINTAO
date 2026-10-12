"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./providers";

const NAV = [
  { href: "/", label: "INICIO" },
  { href: "/tienda", label: "TIENDA" },
  { href: "/tienda?orden=nuevos", label: "LO NUEVO" },
  { href: "/informacion", label: "AYUDA" },
];

const TICKER = [
  "Envíos a toda Colombia",
  "Descuento por volumen desde 12 unidades",
  "Hecho pa' salir",
  "Confirmación humana antes de despachar",
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  // Un solo listener rAF-throttled para estado del header y progreso de lectura.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScrolled(y > 12);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      {/* Accesibilidad: primer elemento tabulable para saltar la navegación. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-display focus:text-xs focus:tracking-[0.2em] focus:text-noir"
      >
        SALTAR AL CONTENIDO
      </a>

      {/* Cinta informativa en movimiento (contenido duplicado para el bucle). */}
      <div className="overflow-hidden border-b border-line bg-accent text-noir" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {TICKER.map((item) => (
                <span
                  key={item}
                  className="flex items-center whitespace-nowrap py-1.5 pl-8 font-display text-[11px] uppercase tracking-[0.3em]"
                >
                  {item}
                  <span className="ml-8 text-noir/40">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled || menuOpen ? "glass" : "bg-transparent"
        }`}
      >
        <div className="container-x flex items-center justify-between py-4">
          <Link href="/" className="font-display text-2xl tracking-tight" aria-label="PINTAO, ir al inicio">
            PINTAO
            <span className="block text-[9px] font-normal tracking-[0.3em] text-sand">
              STREETWEAR · COLOMBIA +57
            </span>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex" aria-label="Navegación principal">
            {NAV.map((item) => {
              const active = pathname === item.href.split("?")[0];
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group relative font-display text-xs tracking-[0.25em] transition-colors hover:text-accent data-[active]:text-accent"
                  data-active={active ? "" : undefined}
                >
                  <span className={active ? "text-accent" : "text-cream"}>{item.label}</span>
                  {/* Subrayado que se dibuja al pasar el cursor. */}
                  <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full group-focus-visible:w-full" />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/acceso"
              className="hidden font-display text-xs tracking-[0.25em] text-cream transition-colors hover:text-accent sm:block"
              aria-label="Ir al formulario de acceso"
            >
              ACCESO
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-2 rounded-full border border-line bg-noir/5 px-4 py-2 font-display text-xs tracking-[0.2em] text-cream transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
              aria-label={"Abrir carrito de compras, " + (count > 0 ? count + " artículos" : "vacío")}
              aria-haspopup="dialog"
            >
              CARRITO
              <span
                className="flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full bg-accent px-1 text-[11px] font-bold text-noir"
                aria-hidden="true"
              >
                {/* `key` remonta el número para animar cada cambio de cantidad. */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    initial={reduce ? false : { y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduce ? undefined : { y: 12, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-line p-2 transition-colors hover:border-accent lg:hidden"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Progreso de lectura de la página. */}
        <div className="h-px w-full bg-line/60" aria-hidden="true">
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              id="menu-movil"
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-line bg-noir/95 lg:hidden"
              aria-label="Menú móvil"
            >
              <div className="container-x py-2">
                {NAV.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.3 }}
                  >
                    <Link
                      href={item.href}
                      className="block border-b border-line/60 py-3.5 font-display text-sm tracking-[0.25em] transition-colors hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                <Link href="/acceso" className="block py-3.5 font-display text-sm tracking-[0.25em] text-accent">
                  ACCESO
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

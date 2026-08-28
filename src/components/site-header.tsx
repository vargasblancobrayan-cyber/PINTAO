"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./providers";

const NAV = [
  { href: "/", label: "INICIO" },
  { href: "/tienda", label: "TIENDA" },
  { href: "/tienda?orden=nuevos", label: "LO NUEVO" },
  { href: "/informacion", label: "AYUDA" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <div className="overflow-hidden border-b border-line bg-accent text-noir">
        <div className="flex items-center justify-center gap-4 py-1.5 font-display text-[11px] tracking-[0.3em] uppercase whitespace-nowrap">
          <span>Envíos a toda Colombia</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Hecho pa&apos; salir</span>
        </div>
      </div>
      <header
        className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled ? "glass" : "bg-transparent"}`}
      >
        <div className="container-x flex items-center justify-between py-4">
          <Link href="/" className="font-display text-2xl tracking-tight">
            PINTAO
            <span className="block text-[9px] font-normal tracking-[0.3em] text-sand">
              STREETWEAR · COLOMBIA +57
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegación principal">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`font-display text-xs tracking-[0.25em] transition-colors hover:text-accent ${
                  pathname === item.href.split("?")[0] && item.href === pathname
                    ? "text-accent"
                    : "text-cream"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/acceso"
              className="hidden font-display text-xs tracking-[0.25em] text-cream hover:text-accent sm:block"
            >
              ACCESO
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="relative flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-display tracking-[0.2em] hover:border-accent transition-colors"
              aria-label="Abrir carrito"
            >
              CARRITO
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-noir">
                {count}
              </span>
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-line p-2 lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-line bg-noir/95 px-5 py-4 lg:hidden" aria-label="Menú móvil">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block py-3 font-display text-sm tracking-[0.25em] hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/acceso" className="block py-3 font-display text-sm tracking-[0.25em] text-accent">
              ACCESO
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

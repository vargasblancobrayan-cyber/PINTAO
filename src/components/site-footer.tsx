import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

const cols = [
  {
    title: "COMPRAR",
    links: [
      { href: "/tienda", label: "Todo el catálogo" },
      { href: "/tienda?categoria=Oversize", label: "Oversize" },
      { href: "/tienda?categoria=Jeans", label: "Jeans" },
      { href: "/tienda?categoria=Zapatos", label: "Accesorios" },
    ],
  },
  {
    title: "INFORMACIÓN",
    links: [
      { href: "/informacion", label: "Envíos" },
      { href: "/informacion", label: "Cambios y devoluciones" },
      { href: "/informacion", label: "Privacidad" },
      { href: "/acceso", label: "Mi cuenta" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-coal">
      <div className="container-x grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="font-display text-2xl tracking-tight">
            PINTAO
            <span className="block text-[9px] font-normal tracking-[0.3em] text-sand">
              STREETWEAR · COLOMBIA +57
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-sand">
            La pinta del parche. Streetwear colombiano hecho pa&apos; salir.
          </p>
        </div>
        {cols.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h4 className="eyebrow mb-4">{col.title}</h4>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sand transition-colors hover:text-cream">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h4 className="eyebrow mb-4">ENTÉRATE PRIMERO</h4>
          <p className="mb-4 text-sm text-sand">
            Deja tu correo y recibe los próximos drops de PINTAO.
          </p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs tracking-[0.25em] text-mute font-display">
        © 2026 PINTAO COLOMBIA
      </div>
    </footer>
  );
}

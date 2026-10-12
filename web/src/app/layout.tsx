import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["400", "500", "600", "700", "800", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/*
 * Render dinámico en todo el árbol.
 *
 * La CSP con `nonce` (ver `src/middleware.ts`) sólo protege HTML generado por
 * petición: una página pre-renderizada se sirve con scripts inline sin nonce y el
 * navegador los bloquea (página visible pero sin hidratación). Next.js lo
 * documenta así: usar nonce implica render dinámico.
 *
 * El coste es asumible: el catálogo es local y las páginas ya se renderizan en
 * el servidor con datos en memoria. Si en el futuro se prioriza cachear HTML en
 * el borde, hay que cambiar la CSP a hashes o permitir `'unsafe-inline'` en
 * scripts (ver SECURITY.md, «CSP y render»).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://pintao-store.vercel.app"),
  title: {
    default: "PINTAO — Streetwear Colombia",
    template: "%s — PINTAO",
  },
  description:
    "La pinta habla primero. Básicos, oversize, denim y accesorios hechos pa' salir. Envíos a toda Colombia y descuentos por volumen.",
  keywords: ["streetwear", "colombia", "PINTAO", "gorras", "jeans", "oversize", "moda urbana"],
  openGraph: {
    title: "PINTAO — Streetwear Colombia",
    description: "La pinta habla primero. Hecho pa' salir.",
    url: "https://pintao-store.vercel.app",
    siteName: "PINTAO",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PINTAO — Streetwear Colombia",
    description: "La pinta habla primero. Hecho pa' salir.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${inter.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          <main id="contenido" className="min-h-[70vh]">
            {children}
          </main>
          <CartDrawer />
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

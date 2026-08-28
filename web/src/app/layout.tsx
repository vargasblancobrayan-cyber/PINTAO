import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["400", "500", "600", "700", "800", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
          <main className="min-h-[70vh]">{children}</main>
          <CartDrawer />
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

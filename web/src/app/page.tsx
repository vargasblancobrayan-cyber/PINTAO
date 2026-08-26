import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";

const categoryTiles = [
  { name: "OVERSIZE", href: "/tienda?categoria=Oversize", img: "https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=1200&q=84", wide: true },
  { name: "JEANS", href: "/tienda?categoria=Jeans", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=84", wide: false },
  { name: "CHAQUETAS", href: "/tienda?categoria=Chaquetas", img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=84", wide: false },
  { name: "BÁSICAS", href: "/tienda?categoria=Básicas", img: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1200&q=84", wide: true },
];

const services = [
  ["01", "Stock por talla", "Consulta las unidades realmente disponibles antes de agregar al pedido."],
  ["02", "Descuento automático", "El precio mejora desde 12, 24 y 48 unidades combinadas."],
  ["03", "Pedido combinado", "Mezcla referencias, colores y tallas en un mismo carrito."],
  ["04", "Confirmación humana", "Revisamos disponibilidad, envío y pago antes de despachar."],
] as const;

export default function HomePage() {
  const featured = products.filter((p) => p.tag === "DESTACADO").slice(0, 8);

  return (
    <>
      {/* HERO cinematográfico */}
      <section className="relative flex min-h-[88svh] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=2000&q=86"
          alt="Editorial urbana PINTAO"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-noir/30" />
        <div className="container-x relative z-10 pb-16 pt-40">
          <Reveal>
            <p className="eyebrow mb-4">DROP 01 · COLOMBIA 2026</p>
            <h1 className="display-title text-[18vw] sm:text-[14vw] lg:text-[9.5vw] max-w-5xl">
              SALGA BIEN
              <br />
              <span className="text-accent">PINTAO.</span>
            </h1>
            <p className="mt-6 max-w-xl text-balance text-base text-cream/80 sm:text-lg">
              Streetwear colombiano para armar la pinta completa: siluetas oversize, denim,
              cargos y básicos que hablan primero.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/tienda" className="btn-solid">VER EL DROP</Link>
              <Link href="#drop" className="btn-ghost">DESCUBRIR LA PINTA</Link>
            </div>
          </Reveal>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-line glass">
          <div className="container-x flex flex-wrap gap-x-8 gap-y-1 py-3 font-display text-[10px] tracking-[0.3em] text-sand">
            <span>DE COLOMBIA PA&apos; LA CALLE · +57</span>
            <span>DESCUENTO POR VOLUMEN DESDE 12 UND.</span>
            <span className="hidden sm:inline">ENVÍOS A TODO EL PAÍS</span>
          </div>
        </div>
      </section>

      {/* Colecciones */}
      <section className="container-x mt-20">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">ARMA TU PINTA</p>
            <h2 className="display-title text-4xl sm:text-5xl">Una vibra distinta<br />para cada plan.</h2>
          </div>
          <Link href="/tienda" className="btn-ghost hidden sm:inline-flex">VER TODO</Link>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {categoryTiles.map((tile, i) => (
            <Reveal key={tile.name} delay={i * 0.08}>
              <Link
                href={tile.href}
                className="group relative block overflow-hidden rounded-2xl border border-line"
              >
                <div className="relative aspect-[4/3] sm:aspect-[16/7]">
                  <Image
                    src={tile.img}
                    alt={tile.name}
                    fill
                    sizes="(min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir/85 to-noir/10" />
                  <div className="absolute bottom-0 p-6">
                    <p className="display-title text-2xl tracking-tight">{tile.name}</p>
                    <p className="mt-1 font-display text-xs tracking-[0.3em] text-accent">EXPLORAR →</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <section id="drop" className="container-x mt-20 scroll-mt-24">
        <Reveal className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">LO QUE ESTÁ SONANDO</p>
            <h2 className="display-title text-4xl sm:text-5xl">Las pintas del momento.</h2>
          </div>
          <Link href="/tienda?orden=nuevos" className="btn-ghost hidden sm:inline-flex">VER TODO EL DROP</Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Manifiesto */}
      <section className="container-x mt-24">
        <div className="grid items-center gap-10 rounded-3xl border border-line bg-coal p-8 sm:p-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-3">MANIFIESTO PINTAO</p>
            <h2 className="display-title text-4xl sm:text-5xl">La pinta<br />habla primero.</h2>
            <p className="mt-5 max-w-md text-cream/75">
              No vestimos personajes: vestimos actitud. PINTAO nace entre amigos, en Colombia,
              para quienes hacen de cualquier calle su propio escenario.
            </p>
            <Link href="/tienda?categoria=Estampadas" className="btn-solid mt-8 inline-flex">
              VER PRENDAS CON ACTITUD
            </Link>
          </Reveal>
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=86"
                alt="Editorial urbana de PINTAO en Colombia"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Servicios */}
      <section className="container-x mt-24">
        <Reveal className="mb-8">
          <p className="eyebrow mb-2">UNA COMPRA MÁS CLARA</p>
          <h2 className="display-title text-4xl sm:text-5xl">Pensada para negocios.</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(([num, title, desc], i) => (
            <Reveal key={num} delay={i * 0.07}>
              <div className="card-surface p-6">
                <span className="font-display text-3xl text-accent">{num}</span>
                <h3 className="mt-4 font-display text-lg uppercase">{title}</h3>
                <p className="mt-2 text-sm text-sand">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

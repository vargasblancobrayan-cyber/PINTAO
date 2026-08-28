import { notFound } from "next/navigation";
import { getActiveProducts, getProduct } from "@/lib/products";
import { recommend } from "@/lib/recommendations";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product) return { title: "Producto no encontrado" };
  const description = `${product.name} · ${product.category} ${product.color}. ${product.description} Envíos a toda Colombia y descuentos por volumen desde 12 unidades.`;
  return {
    title: product.name,
    description: description.slice(0, 160),
    openGraph: {
      title: `${product.name} — PINTAO`,
      description,
      images: [{ url: product.img, alt: product.name }],
      locale: "es_CO",
      type: "website",
    },
    alternates: { canonical: `/producto/${product.id}` },
  };
}

export function generateStaticParams() {
  return getActiveProducts().map((p) => ({ id: String(p.id) }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product || !product.active) notFound();

  const suggestions = recommend(product, getActiveProducts(), 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.gallery,
    description: product.description,
    category: product.category,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "COP",
      lowPrice: product.price,
      highPrice: product.price * (1 + 0.2),
      offerCount: product.variants.length,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-x py-12 sm:py-16">
        <ProductDetail product={product} />
      <section className="mt-20">
        <Reveal>
          <p className="eyebrow mb-2">COMPLETA TU PINTA</p>
          <h2 className="display-title mb-8 text-3xl sm:text-4xl">Recomendado por PINTAO.</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
          {suggestions.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}

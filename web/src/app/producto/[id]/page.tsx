import { notFound } from "next/navigation";
import { getActiveProducts, getProduct } from "@/lib/products";
import { recommend } from "@/lib/recommendations";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  return { title: product ? `${product.name} — PINTAO` : "Producto no encontrado" };
}

export function generateStaticParams() {
  return getActiveProducts().map((p) => ({ id: String(p.id) }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product || !product.active) notFound();

  const suggestions = recommend(product, getActiveProducts(), 4);

  return (
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
  );
}

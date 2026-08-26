import { getActiveProducts, categories, colors, allSizes } from "@/lib/products";
import { Storefront } from "@/components/storefront";

export const metadata = { title: "Tienda — PINTAO" };

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; orden?: string }>;
}) {
  const { categoria, orden } = await searchParams;

  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow mb-2">EL DROP COMPLETO</p>
      <h1 className="display-title mb-10 text-5xl sm:text-6xl">Tienda.</h1>
      <Storefront
        products={getActiveProducts()}
        categories={categories}
        colors={colors}
        sizes={allSizes}
        initialCategory={categoria}
        initialSort={orden}
      />
    </div>
  );
}

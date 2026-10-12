import type { Product, Variant } from "./types";
import { products, getProduct } from "./products";

/**
 * Operaciones de catálogo del panel administrativo.
 *
 * Antes este módulo mantenía un `Map` propio y paralelo al catálogo público, así
 * que cualquier edición del panel era invisible en la tienda (el admin editaba
 * una copia que nadie leía). Ahora se opera sobre el **mismo** arreglo de
 * `products.ts` que sirve la tienda.
 *
 * Limitación documentada: sigue siendo estado en memoria del proceso. Con
 * Supabase configurado la fuente definitiva es la tabla `pintao_store`; aquí no
 * se escribe en base de datos (ver ROADMAP «estrategia de catálogo»).
 */

function buildVariants(id: number, sizes: string[], color: string, stock: number): Variant[] {
  const clean = [...new Set(sizes.map((s) => s.trim()).filter(Boolean))];
  if (clean.length === 0) return [];
  const base = Math.floor(stock / clean.length);
  const extra = stock % clean.length;
  return clean.map((size, i) => ({
    size,
    color,
    stock: base + (i < extra ? 1 : 0),
    sku: `PNT-${id}-${size.replace(/\s/g, "")}`,
  }));
}

/** Reparte un stock total entre las variantes conservando tallas y sku. */
function resyncVariants(product: Product, totalStock: number): Variant[] {
  const sizes = product.sizes.length ? product.sizes : product.variants.map((v) => v.size);
  return buildVariants(product.id, sizes, product.color, totalStock);
}

export function getProductByIdAdmin(id: number): Product | undefined {
  return getProduct(id);
}

/** Devuelve el catálogo administrable (misma referencia que la tienda). */
export function getAllProductsAdmin(): Product[] {
  return products;
}

export interface ProductInput {
  id?: number;
  name: string;
  slug: string;
  price: number;
  category: string;
  color: string;
  sizes: string[];
  stock: number;
  img: string;
  gallery: string[];
  description: string;
  tag: "NUEVO" | "DESTACADO";
  active: boolean;
}

export function createProduct(input: ProductInput) {
  if (input.id !== undefined && getProduct(input.id)) {
    return { ok: false as const, error: "Ya existe un producto con este ID" };
  }
  if (!input.name?.trim()) return { ok: false as const, error: "El nombre es obligatorio" };
  if (!input.sizes?.length) return { ok: false as const, error: "Indica al menos una talla" };

  const id = input.id ?? Math.max(0, ...products.map((p) => p.id)) + 1;
  const stock = Math.max(0, Number(input.stock) || 0);
  const sizes = [...new Set(input.sizes.map((s) => s.trim()).filter(Boolean))];

  const product: Product = {
    id,
    name: input.name.trim(),
    slug: input.slug?.trim() || String(id),
    price: Math.max(0, Number(input.price) || 0),
    category: input.category.trim(),
    color: input.color.trim(),
    sizes,
    stock,
    img: input.img.trim(),
    gallery: input.gallery?.length ? input.gallery : [input.img.trim()],
    description: input.description.trim(),
    variants: buildVariants(id, sizes, input.color.trim(), stock),
    tag: input.tag,
    active: input.active,
  };

  products.push(product);
  return { ok: true as const, product };
}

export function updateProductAdmin(id: number, input: Partial<ProductInput>) {
  const product = getProduct(id);
  if (!product) return { ok: false as const, error: "Producto no encontrado" };

  if (input.name?.trim()) product.name = input.name.trim();
  if (input.slug?.trim()) product.slug = input.slug.trim();
  if (input.price !== undefined) product.price = Math.max(0, Number(input.price) || 0);
  if (input.category?.trim()) product.category = input.category.trim();
  if (input.color?.trim()) product.color = input.color.trim();
  if (input.img?.trim()) product.img = input.img.trim();
  if (input.gallery?.length) product.gallery = input.gallery;
  if (input.description?.trim()) product.description = input.description.trim();
  if (input.tag) product.tag = input.tag;
  if (input.active !== undefined) product.active = input.active;
  if (input.sizes?.length) {
    product.sizes = [...new Set(input.sizes.map((s) => s.trim()).filter(Boolean))];
  }
  if (input.stock !== undefined || input.sizes?.length) {
    // El stock editado es el total del producto: se reparte entre tallas y el
    // total se recalcula desde las variantes para que ambos números cuadren.
    product.stock = Math.max(0, Number(input.stock ?? product.stock) || 0);
    product.variants = resyncVariants(product, product.stock);
    product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return { ok: true as const, product };
}

/** Baja lógica: la prenda deja de mostrarse en la tienda sin perder su ficha. */
export function deleteProductAdmin(id: number): boolean {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

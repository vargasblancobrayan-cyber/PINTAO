import type { Product, Variant } from "./types";
import { slugify } from "./format";

type RawProduct = [
  id: number,
  name: string,
  price: number,
  category: string,
  color: string,
  sizes: string[],
  stock: number,
  img: string,
  description: string,
];

const raw: RawProduct[] = [
  [1, "Polo Azul Nocturno", 56900, "Camisetas", "Azul", ["S", "M", "L", "XL"], 32, "https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?auto=format&fit=crop&w=900&q=85", "Esencial de cuello polo con estructura limpia y tacto suave."],
  [2, "Camiseta Premium Carbón", 54900, "Básicas", "Negro", ["S", "M", "L", "XL", "XXL"], 28, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", "Camiseta versátil de corte regular para una rotación comercial constante."],
  [3, "Oversize Arena", 49900, "Oversize", "Crema", ["S", "M", "L", "XL"], 19, "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85", "Silueta amplia, hombro caído y presencia urbana."],
  [4, "Polo Essential Blanco", 57900, "Camisetas", "Blanco", ["S", "M", "L", "XL"], 36, "https://images.unsplash.com/photo-1625910513413-5fc45e7b3086?auto=format&fit=crop&w=900&q=85", "Polo luminoso para vitrinas de básicos premium."],
  [5, "Chaqueta Urban Negra", 98900, "Chaquetas", "Negro", ["S", "M", "L", "XL"], 13, "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85", "Chaqueta ligera con estética nocturna y acabado resistente."],
  [6, "Buzo Active Arena", 74900, "Deportiva", "Crema", ["S", "M", "L", "XL"], 21, "https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=85", "Capa cómoda para movimiento diario y looks deportivos."],
  [7, "Jean Slim Índigo", 89900, "Jeans", "Azul", ["30", "32", "34", "36", "38"], 24, "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85", "Denim índigo de silueta slim y construcción comercial."],
  [8, "Cargo Utility Negro", 84900, "Cargos", "Negro", ["30", "32", "34", "36"], 17, "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85", "Pantalón cargo con bolsillos funcionales y caída contemporánea."],
  [9, "Gorra Essential Negra", 35900, "Gorras", "Negro", ["ÚNICA"], 40, "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85", "Accesorio ajustable de seis paneles y acabado mate."],
  [10, "Camiseta Training Blanca", 52900, "Deportiva", "Blanco", ["S", "M", "L", "XL"], 31, "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=85", "Camiseta liviana para actividad, viaje y uso cotidiano."],
  [11, "Chaqueta Denim Azul", 119900, "Chaquetas", "Azul", ["S", "M", "L", "XL"], 8, "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=900&q=85", "Denim estructurado con lavado azul y herrajes metálicos."],
  [12, "Gorra Premium Crema", 38900, "Gorras", "Crema", ["ÚNICA"], 27, "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85", "Gorra tonal para completar colecciones neutras."],
  [13, "Tenis Urban Blanco", 129900, "Zapatos", "Blanco", ["39", "40", "41", "42", "43"], 0, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85", "Tenis de perfil limpio y suela confortable."],
  [14, "Perfume Signature Noir", 159900, "Perfumes", "Negro", ["100 ML"], 14, "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85", "Aroma amaderado de carácter nocturno y larga duración."],
  [15, "Morral Executive Negro", 89900, "Morrales", "Negro", ["ÚNICA"], 12, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85", "Morral funcional con compartimentos para trabajo y viaje."],
  [16, "Correa Classic Café", 44900, "Correas", "Café", ["M", "L", "XL"], 22, "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=85", "Correa clásica de textura sobria y hebilla metálica."],
  [17, "Camiseta Gráfica District", 59900, "Estampadas", "Negro", ["S", "M", "L", "XL"], 25, "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85", "Gráfico frontal de inspiración urbana sobre algodón de alto gramaje."],
  [18, "Básica Heavy Blanco", 51900, "Básicas", "Blanco", ["S", "M", "L", "XL"], 30, "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85", "Básica de alto gramaje, cuello reforzado y tacto compacto."],
  [19, "Pantalón Chino Piedra", 79900, "Pantalones", "Crema", ["30", "32", "34", "36"], 20, "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85", "Chino versátil con pinza suave y ajuste cómodo."],
  [20, "Bermuda Resort Arena", 64900, "Bermudas", "Crema", ["30", "32", "34", "36"], 22, "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=85", "Bermuda liviana de largo comercial para clima cálido."],
  [21, "Oversize Washed Grafito", 62900, "Oversize", "Negro", ["S", "M", "L", "XL"], 18, "https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=85", "Oversize de lavado grafito con tacto vintage."],
  [22, "Jean Straight Vintage", 94900, "Jeans", "Azul", ["30", "32", "34", "36", "38"], 16, "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85", "Jean recto de lavado medio y construcción resistente."],
];

function buildVariants(id: number, sizes: string[], color: string, stock: number): Variant[] {
  const base = Math.floor(stock / sizes.length);
  const extra = stock % sizes.length;
  return sizes.map((size, i) => ({
    size,
    color,
    stock: base + (i < extra ? 1 : 0),
    sku: `PNT-${id}-${size.replace(/\s/g, "")}`,
  }));
}

/**
 * Imágenes complementarias por categoría para armar la galería multi-imagen
 * (la imagen principal siempre es `img`). Paletas editoriales Unsplash.
 */
const GALLERY_BY_CATEGORY: Record<string, string[]> = {
  Camisetas: [
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=85",
  ],
  Básicas: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85",
  ],
  Oversize: [
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=85",
  ],
  Estampadas: [
    "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85",
  ],
  Deportiva: [
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=900&q=85",
  ],
  Chaquetas: [
    "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85",
  ],
  Jeans: [
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85",
  ],
  Cargos: [
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=900&q=85",
  ],
  Pantalones: [
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85",
  ],
  Bermudas: [
    "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
  ],
  Gorras: [
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85",
  ],
  Zapatos: [
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=900&q=85",
  ],
  Perfumes: [
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85",
  ],
  Morrales: [
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85",
  ],
  Correas: [
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=85",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
  ],
};

export const products: Product[] = raw.map(
  ([id, name, price, category, color, sizes, stock, img, description]) => ({
    id,
    name,
    slug: slugify(name),
    price,
    category,
    color,
    sizes,
    stock,
    img,
    gallery: [img, ...(GALLERY_BY_CATEGORY[category] ?? [])],
    description,
    variants: buildVariants(id, sizes, color, stock),
    tag: id % 4 === 0 ? "DESTACADO" : "NUEVO",
    active: true,
  }),
);

export const categories = [...new Set(products.map((p) => p.category))];
export const colors = [...new Set(products.map((p) => p.color))];
export const allSizes = [...new Set(products.flatMap((p) => p.sizes))];

export function getProduct(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getActiveProducts(): Product[] {
  return products.filter((p) => p.active);
}

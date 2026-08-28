import type { Product } from "./types";

/**
 * Motor de recomendación por reglas (Fase IA-1).
 * Puntúa productos por afinidad de categoría, color y rango de precio,
 * priorizando "completar la pinta": outfit antes que más de lo mismo.
 */
export function recommend(target: Product, pool: Product[], limit = 4): Product[] {
  const complements: Record<string, string[]> = {
    Camisetas: ["Jeans", "Cargos", "Pantalones", "Gorras"],
    Básicas: ["Jeans", "Cargos", "Pantalones", "Gorras"],
    Oversize: ["Jeans", "Cargos", "Gorras", "Correas"],
    Estampadas: ["Jeans", "Cargos", "Gorras"],
    Jeans: ["Camisetas", "Básicas", "Oversize", "Chaquetas"],
    Cargos: ["Camisetas", "Oversize", "Chaquetas"],
    Pantalones: ["Camisetas", "Pantalones", "Correas"],
    Bermudas: ["Camisetas", "Básicas", "Gorras"],
    Chaquetas: ["Camisetas", "Básicas", "Jeans"],
    Deportiva: ["Pantalones", "Gorras", "Zapatos"],
    Gorras: ["Camisetas", "Oversize", "Jeans"],
    Zapatos: ["Jeans", "Pantalones", "Correas"],
    Perfumes: ["Correas", "Morrales"],
    Morrales: ["Correas", "Perfumes"],
    Correas: ["Jeans", "Pantalones"],
  };

  const preferred = complements[target.category] ?? [];

  const score = (p: Product): number => {
    let s = 0;
    const complementIdx = preferred.indexOf(p.category);
    if (complementIdx >= 0) s += 100 - complementIdx * 10; // categoría complementaria
    else if (p.category === target.category) s += 10; // misma categoría pesa menos
    if (p.color === target.color) s += 20;
    const priceRatio = Math.min(p.price, target.price) / Math.max(p.price, target.price);
    s += priceRatio * 30;
    if (p.tag === "DESTACADO") s += 5;
    return s;
  };

  return pool
    .filter((p) => p.id !== target.id && p.active)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

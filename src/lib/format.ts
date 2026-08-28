const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number): string {
  return cop.format(value);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Descuento por volumen: mejora de precio por unidad desde 12/24/48 und. */
export function volumeDiscount(qty: number): number {
  if (qty >= 48) return 0.18;
  if (qty >= 24) return 0.12;
  if (qty >= 12) return 0.08;
  return 0;
}

export function unitPriceWithDiscount(base: number, qty: number): number {
  return Math.round(base * (1 - volumeDiscount(qty)));
}

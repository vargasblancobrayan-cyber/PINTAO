import type { MetadataRoute } from "next";
import { products } from "@/lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pintao-store.vercel.app";

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/tienda", priority: 0.9 },
    { path: "/checkout", priority: 0.6 },
    { path: "/cuenta", priority: 0.5 },
    { path: "/acceso", priority: 0.5 },
    { path: "/informacion", priority: 0.4 },
  ].map((r) => ({ url: `${base}${r.path}`, lastModified: new Date(), priority: r.priority }));

  const productRoutes = products
    .filter((p) => p.active)
    .map((p) => ({
      url: `${base}/producto/${p.id}`,
      lastModified: new Date(),
      priority: 0.8,
    }));

  return [...staticRoutes, ...productRoutes];
}
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/checkout", "/cuenta", "/admin", "/api"] }],
    sitemap: "https://pintao-store.vercel.app/sitemap.xml",
  };
}
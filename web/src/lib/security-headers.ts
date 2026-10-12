import type { NextConfig } from "next";

/**
 * Headers de seguridad para la aplicación PINTAO.
 *
 * La **CSP vive ahora en `src/middleware.ts`** porque necesita un nonce por
 * petición para que Next.js pueda ejecutar sus propios scripts (ver el
 * comentario del middleware: `'strict-dynamic'` sin nonce bloquea todo el JS).
 *
 * Aquí se mantienen el resto de cabeceras de defensa en profundidad:
 * - HSTS (fuerza HTTPS)
 * - X-Frame-Options / frame-ancestors (clickjacking)
 * - nosniff (MIME sniffing)
 * - Referrer-Policy y Permissions-Policy
 *
 * Y el cacheo correcto de assets: antes se aplicaba `Cache-Control: no-store`
 * a **todas** las rutas, incluidos `/_next/static/*`, lo que obligaba al
 * navegador a descargar de nuevo cada chunk de JS/CSS en cada navegación.
 */

const SAFE_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), " +
      "microphone=(), " +
      "geolocation=(), " +
      "payment=(), " +
      "usb=(), " +
      "magnetometer=(), " +
      "gyroscope=(), " +
      "accelerometer=()",
  },
];

export const securityHeaders = [
  {
    source: "/(.*)",
    headers: SAFE_HEADERS,
  },
  {
    // Chunks con hash de contenido: inmutables.
    source: "/_next/static/(.*)",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  },
  {
    // Imágenes ya optimizadas por next/image.
    source: "/_next/image(.*)",
    headers: [
      { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
    ],
  },
  {
    source: "/icons/(.*)",
    headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
  },
];

/**
 * Aplica todos los headers de seguridad al Next.js config.
 * Se usa en `next.config.ts`.
 */
export function withSecurityHeaders(nextConfig: NextConfig): NextConfig {
  return {
    ...nextConfig,
    // `headers` es una función que retorna un Promise/array de headers
    async headers() {
      const parent = await nextConfig.headers?.();
      return [
        ...securityHeaders,
        ...(Array.isArray(parent) ? parent : []),
      ];
    },
  };
}

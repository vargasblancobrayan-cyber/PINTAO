import { NextResponse, type NextRequest } from "next/server";

/**
 * CSP con nonce por petición.
 *
 * Antes vivía en `next.config.ts` como `script-src 'self' 'strict-dynamic'`.
 * Con `'strict-dynamic'` presente, la allowlist por host se ignora y **solo** se
 * ejecutan los scripts creados por un script de confianza (nonce o hash). Al no
 * existir nonce, el navegador bloqueaba todos los chunks de Next y su bootstrap
 * inline: la aplicación servía HTML pero no hidrataba (carrito, filtros, checkout
 * y formularios muertos).
 *
 * Aquí generamos un nonce por respuesta; Next.js lo propaga automáticamente a sus
 * `<script>` (incluidos los inline del payload RSC) al leer la cabecera
 * `Content-Security-Policy` de la petición.
 */
export const CSP_HEADER = "Content-Security-Policy";

export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind/next/font y framer-motion inyectan estilos inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Documentos y API: todo menos assets estáticos, optimizador de imágenes,
     * favicon e imágenes de `public/`. Esos no pueden ejecutar scripts y sí
     * necesitan cachearse agresivamente.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpe?g|svg|webp|avif|ico|gif|txt|xml|woff2?)$).*)",
  ],
};

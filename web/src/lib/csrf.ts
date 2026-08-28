import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://pintao-store.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

/**
 * Protección CSRF básica para endpoints de escritura.
 * Next.js ya bloquea cookies cross-site con SameSite=Lax, pero un chequeo
 * de Origin explícito añade defensa en profundidad contra formularios hostiles.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // peticiones no-navegador (curl, tests) no llevan Origin
  const url = new URL(req.url);
  const host = url.origin;
  const allowed = ALLOWED_ORIGINS.has(origin) || origin === host;
  if (!allowed) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}
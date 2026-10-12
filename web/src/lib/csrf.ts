const ALLOWED_ORIGINS = new Set([
  "https://pintao-store.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

/** Protección CSRF básica para endpoints de escritura. */
export function assertSameOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // peticiones no-navegador (curl, tests) no llevan Origin
  const url = new URL(req.url);
  const host = url.origin;
  const allowed = ALLOWED_ORIGINS.has(origin) || origin === host;
  if (!allowed) {
    return Response.json({ error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}

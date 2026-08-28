/**
 * Rate limiting en memoria para endpoints de escritura.
 * En producción (Supabase/Upstash) se sustituye por un store distribuido,
 * pero esta capa ya protege los endpoints contra abuso básico en demo.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Limpieza perezosa: evita que el Map crezca sin cota. */
function sweep(now: number) {
  if (buckets.size > 10_000) {
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  { windowMs =  60_000, max = 30 }: { windowMs?: number; max?: number } = {},
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count +=  1;
  if (bucket.count > max) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  return { ok: true };
}

/** Intenta resolver una IP real desde headers de proxy (Vercel). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
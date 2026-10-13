import crypto from "crypto";

import { getDb } from "./db";

/**
 * Idempotencia de endpoints de escritura y deduplicación de webhooks.
 *
 * Problema real que resuelve: sin esto, un reintento del navegador, un F5 o un
 * doble clic creaban **dos pedidos** (y dos transacciones Wompi) con la misma
 * intención de compra. Wompi, además, reintenta el webhook hasta 3 veces, así que
 * sin memoria de eventos el mismo pago se aprobaba repetidamente.
 *
 * Contrato (`Idempotency-Key`, el mismo header que usan Stripe/PayPal):
 * - Misma clave + mismo endpoint → se **repite la respuesta guardada**, no se
 *   ejecuta el trabajo dos veces.
 * - Misma clave mientras la primera petición sigue en curso → `409`.
 * - Sólo se guardan las respuestas 2xx. Un 4xx se descarta para que el cliente
 *   pueda corregir y reintentar con la misma clave.
 *
 * La tabla es `pintao_idempotency` (migración `202610130001`). Sin Supabase el
 * registro vive en memoria del proceso, igual que el resto de la capa demo.
 */

export const IDEMPOTENCY_HEADER = "idempotency-key";

const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Una fila "en curso" más antigua que esto se considera abandonada. */
const STALE_IN_FLIGHT_MS = 2 * 60 * 1000;
const MAX_KEY_LENGTH = 200;

interface StoredResponse {
  status: number;
  body: unknown;
  createdAt: number;
}

const memory = new Map<string, StoredResponse>();
const memoryWebhooks = new Set<string>();

function sweepMemory(now: number) {
  if (memory.size < 5_000) return;
  for (const [key, entry] of memory) {
    if (now - entry.createdAt > MEMORY_TTL_MS) memory.delete(key);
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Clave normalizada desde el header; `null` si no es utilizable. */
export function readIdempotencyKey(req: Request): string | null {
  const raw = req.headers.get(IDEMPOTENCY_HEADER)?.trim();
  if (!raw || raw.length < 8 || raw.length > MAX_KEY_LENGTH) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(raw)) return null;
  return raw;
}

function storageKey(scope: string, key: string): string {
  return sha256(`${scope}:${key}`);
}

export type IdempotencyDecision =
  | { state: "replay"; status: number; body: unknown }
  | { state: "in_flight" }
  | { state: "proceed"; complete: (status: number, body: unknown) => Promise<void> };

function buildComplete(id: string, scope: string, inserted: boolean): (status: number, body: unknown) => Promise<void> {
  return async (status, body) => {
    const now = Date.now();
    if (status < 200 || status >= 300) {
      // Un fallo no se cachea: el cliente debe poder reintentar el mismo trabajo.
      memory.delete(id);
      const db = getDb();
      if (db && inserted) await db.from("pintao_idempotency").delete().eq("key", id);
      return;
    }

    sweepMemory(now);
    memory.set(id, { status, body, createdAt: now });

    const db = getDb();
    if (!db) return;
    await db.from("pintao_idempotency").upsert(
      { key: id, scope, status, body, updated_at: new Date(now).toISOString() },
      { onConflict: "key" },
    );
  };
}

/**
 * Registra la clave y decide si hay que ejecutar el trabajo.
 * Si no viene clave válida, siempre se ejecuta (la idempotencia es opcional).
 */
export async function beginIdempotent(req: Request, scope: string): Promise<IdempotencyDecision> {
  const raw = readIdempotencyKey(req);
  if (!raw) return { state: "proceed", complete: async () => {} };

  const id = storageKey(scope, raw);
  const now = Date.now();
  sweepMemory(now);

  const cached = memory.get(id);
  if (cached && now - cached.createdAt <= MEMORY_TTL_MS) {
    return { state: "replay", status: cached.status, body: cached.body };
  }

  const db = getDb();
  if (!db) return { state: "proceed", complete: buildComplete(id, scope, true) };

  const { error } = await db
    .from("pintao_idempotency")
    .insert({ key: id, scope, status: 0, created_at: new Date(now).toISOString() });

  if (!error) return { state: "proceed", complete: buildComplete(id, scope, true) };

  // 23505 = la clave ya existe: hay un resultado guardado o una petición en curso.
  if (error.code === "23505") {
    const { data } = await db
      .from("pintao_idempotency")
      .select("status, body, created_at")
      .eq("key", id)
      .maybeSingle();

    if (data && Number(data.status) === 0) {
      const startedAt = new Date(String(data.created_at ?? "")).getTime();
      if (Number.isFinite(startedAt) && now - startedAt < STALE_IN_FLIGHT_MS) {
        return { state: "in_flight" };
      }
      // Petición abandonada (la función murió antes de responder): se retoma.
      await db
        .from("pintao_idempotency")
        .update({ updated_at: new Date(now).toISOString() })
        .eq("key", id);
      return { state: "proceed", complete: buildComplete(id, scope, true) };
    }

    if (data && data.body != null) {
      memory.set(id, { status: Number(data.status), body: data.body, createdAt: now });
      return { state: "replay", status: Number(data.status), body: data.body };
    }
  }

  // Sin tabla (migración sin aplicar) o error transitorio: no se bloquea la venta.
  return { state: "proceed", complete: buildComplete(id, scope, false) };
}

/**
 * Marca un evento de webhook como procesado.
 *
 * Devuelve `{ first: false }` si ya estaba registrado, para responder 200 y
 * evitar que el proveedor siga reintentando un evento que ya se aplicó.
 */
export async function markWebhookEvent(
  eventKey: string,
  meta: { source: string; orderId?: string; transactionId?: string; status?: string },
): Promise<{ first: boolean }> {
  const db = getDb();
  if (!db) {
    if (memoryWebhooks.has(eventKey)) return { first: false };
    memoryWebhooks.add(eventKey);
    return { first: true };
  }

  const { error } = await db.from("pintao_webhook_events").insert({
    event_key: eventKey,
    source: meta.source,
    order_id: meta.orderId ?? null,
    transaction_id: meta.transactionId ?? null,
    status: meta.status ?? null,
    received_at: new Date().toISOString(),
  });

  // 23505 = ya procesado. Sin tabla (migración sin aplicar) se procesa igual:
  // se prefiere reprocesar un pago a perderlo.
  return { first: !(error && error.code === "23505") };
}

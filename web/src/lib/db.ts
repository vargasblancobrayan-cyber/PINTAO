import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para persistencia real.
 *
 * Sin `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, devuelve `null` y las
 * rutas API caen al store en memoria (server-store.ts). En producción
 * (Vercel con env vars del proyecto Supabase) todas las escrituras/lecturas
 * van a Postgres real.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (url && serviceKey) {
  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { "x-application-name": "pintao-web" },
    },
  });
}

export function getDb(): SupabaseClient | null {
  return client;
}

export function hasDb(): boolean {
  return client !== null;
}
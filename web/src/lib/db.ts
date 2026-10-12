import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/** Type re-export for consumers. */
export type { SupabaseClient };

/** Cliente Supabase para persistencia real. */
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (url && serviceKey) {
  client = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { "x-application-name": "pintao-web" },
    },
  });
}

/** Crea un cliente Supabase (no usado directamente; usa getDb). */
export function createClient(): SupabaseClient | null {
  return client;
}

/** Retorna el cliente Supabase existente o null. */
export function getDb(): SupabaseClient | null {
  return client;
}

/** Verifica si hay un cliente de Supabase configurado. */
export function hasDb(): boolean {
  return client !== null;
}

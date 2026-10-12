import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Client factory for Supabase (real persistence). */
export function createClient(): Database | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey) as unknown as Database;
}

/** Obtains the Supabase client or null. */
export function getSupabase(): Database | null {
  return createClient();
}

/** True if a Supabase client is configured. */
export function hasDb(): boolean {
  return createClient() !== null;
}

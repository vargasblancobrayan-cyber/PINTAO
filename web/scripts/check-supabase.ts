import { createClient } from "@supabase/supabase-js";
import { getDb, hasDb } from "../src/lib/db";

/** Verifica que la conexión a Supabase esté disponible en el entorno. */
export async function checkSupabase() {
  const hasSupabase = hasDb();
  const db = getDb();

  if (!hasSupabase) {
    console.log("SUPABASE_NO_CONFIGURED:", "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos.");
    return false;
  }

  if (!db) {
    console.log("SUPABASE_NO_CLIENT: El cliente de Supabase no pudo crearse.");
    return false;
  }

  // Intentar consulta minimal para verificar conexión
  try {
    // Queries from public that the `anon` role can read
    const { data, error } = await db
      .from("pintao_products")
      .select("id, name")
      .limit(1)
      .single();

    if (error) {
      // If we get an error that's a table-not-exists or RLS issue, we note it.
      // But we can also try a known information schema query.
      const { data: info, error: infoError } = await db.rpc("get_stats");
      if (infoError) {
        console.log("SUPABASE_CONNECT_ERROR:", infoError.message);
        return false;
      }
      if (!info || info.length === 0) {
        console.log("SUPABASE_EMPTY_STATS: La tabla pintao_products no existe o está vacía.");
      }
      console.log("SUPABASE_OK:", "Conexión OK, pero tabla pintao_products no encontrada o sin datos.");
      return true;
    }

    console.log("SUPABASE_OK:", `Conexión OK. Producto: ${data?.name ?? "n/a"}`);
    return true;
  } catch (err) {
    console.log("SUPABASE_CONNECT_ERROR:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

if (require.main === module) {
  checkSupabase().then((ok) => process.exit(ok ? 0 : 1));
}

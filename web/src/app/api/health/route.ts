
import { getActiveProducts } from "@/lib/products";
import { getAllOrders } from "@/lib/persistence";
import { hasDb } from "@/lib/db";
import { isEmailEnabled } from "@/lib/email";
import { getWompiConfig } from "@/lib/wompi";

export const runtime = "nodejs";

/**
 * Comprobación de estado. Además del catálogo y los pedidos, informa de si las
 * integraciones externas están configuradas: antes un despliegue al que le
 * faltaban las claves se veía "sano" y fallaba en el checkout con 503.
 */
export async function GET() {
  const orders = await getAllOrders();
  return Response.json({
    ok: true,
    products: getActiveProducts().length,
    orders: orders.length,
    storage: hasDb() ? "supabase" : "memory",
    email: isEmailEnabled() ? "resend" : "disabled",
    payments: getWompiConfig().enabled ? "wompi" : "disabled",
  });
}

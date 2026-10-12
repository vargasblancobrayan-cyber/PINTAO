import { cookies } from "next/headers";

import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findOrderById, updateOrderStatus } from "@/lib/persistence";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/** Estados válidos del pedido (los mismos que ofrece el panel). */
const ORDER_STATUSES = [
  "Pendiente de confirmación",
  "Pagado",
  "Enviado",
  "Completado",
  "Cancelado",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Resuelve el pedido tanto en Postgres como en el store en memoria.
 * Antes este endpoint devolvía 503 sin Supabase, así que en desarrollo era
 * inutilizable aunque el resto del panel sí funcionara.
 */
async function loadOrder(id: string) {
  const db = getDb();
  if (!db) return findOrderById(id);

  const { data, error } = await db.from("pintao_orders").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data;
}

/** GET /api/admin/orders/[id] — detalle de un pedido. */
export async function GET(_req: Request, { params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params;
  if (!id) return Response.json({ error: "ID de pedido no proporcionado" }, { status: 400 });

  const cookieStore = await cookies();
  const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (user?.role !== "admin") return Response.json({ error: "Prohibido" }, { status: 403 });

  const order = await loadOrder(id);
  if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });

  return Response.json({ order });
}

/**
 * PATCH /api/admin/orders/[id]
 *
 * - `{ status }`                   → cambia el estado (es lo que envía el panel).
 * - `{ action: "cancel" }`         → cancela y refunde stock (requiere Supabase).
 * - `{ action: "restock", qty }`   → refunde unidades del pedido (requiere Supabase).
 *
 * El panel enviaba `{ status }` pero esta ruta sólo entendía `{ action }`, así que
 * **todos los botones de cambio de estado devolvían 400 "action desconocido"**.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id?: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const { id } = await params;
  if (!id) return Response.json({ error: "ID de pedido no proporcionado" }, { status: 400 });

  const cookieStore = await cookies();
  const user = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (user?.role !== "admin") return Response.json({ error: "Prohibido" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const order = await loadOrder(id);
  if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });

  /* ---------- Cambio de estado ---------- */
  if (isOrderStatus(body?.status)) {
    const status = body.status;
    if (order.status === status) {
      return Response.json({ ok: true, status, unchanged: true });
    }
    const ok = await updateOrderStatus(id, status);
    if (!ok) return Response.json({ error: "No pudimos actualizar el estado." }, { status: 500 });
    return Response.json({ ok: true, status });
  }

  const action = body?.action;

  /* ---------- Acciones administrativas que tocan stock ---------- */
  if (action === "cancel" || action === "restock") {
    const db = getDb();
    if (!db) {
      return Response.json(
        {
          error:
            "Esta acción necesita Supabase: sin base de datos no hay movimientos de stock que registrar.",
        },
        { status: 503 },
      );
    }

    const qty = action === "restock" ? Number(body?.qty) : undefined;
    if (action === "restock" && (!qty || qty < 0)) {
      return Response.json({ error: "qty (número >= 0) es obligatorio" }, { status: 400 });
    }

    const items = (order.items ?? []).map((i: { productId: number; size: string; qty: number }) => ({
      productId: i.productId,
      size: i.size,
      qty: i.qty,
    }));
    const { error: rpcError } = await db.rpc("decrement_stock", { p_items: items });
    if (rpcError) return Response.json({ error: "No pudimos refundir el stock." }, { status: 500 });

    if (action === "cancel") {
      const { error: statusError } = await db
        .from("pintao_orders")
        .update({ status: "Cancelado" })
        .eq("id", id);
      if (statusError) return Response.json({ error: "No pudimos cancelar el pedido." }, { status: 500 });

      return Response.json({ ok: true, action: "cancel" });
    }

    const ok = await updateOrderStatus(id, "Pendiente de confirmación");
    if (!ok) return Response.json({ error: "No pudimos refundir el stock." }, { status: 500 });
    return Response.json({ ok: true, action: "restock", qty });
  }

  return Response.json(
    { error: `Envía { status } con uno de: ${ORDER_STATUSES.join(", ")}.` },
    { status: 400 },
  );
}

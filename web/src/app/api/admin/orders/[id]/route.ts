import { cookies } from "next/headers";

import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { findOrderById, restoreOrderStock, updateOrderStatus } from "@/lib/persistence";
import { commitStock } from "@/lib/stock";
import { sendOrderCancelled, sendOrderShipped } from "@/lib/order-emails";
import { assertSameOrigin } from "@/lib/csrf";
import type { Order } from "@/lib/types";

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
 * - `{ status }`            → cambia el estado (es lo que envía el panel).
 * - `{ action: "cancel" }`  → cancela el pedido y **devuelve** su stock.
 * - `{ action: "restock" }` → deshace una cancelación (vuelve a descontar stock).
 *
 * Ambas acciones de stock son idempotentes: cancelar dos veces no repone inventario
 * dos veces y sólo un pedido cancelado puede reponerse. Hasta ahora, «cancelar»
 * llamaba a `decrement_stock`, es decir **volvía a descontar** en lugar de reponer,
 * y sólo funcionaba con Supabase (503 en modo demo). Ahora usa `lib/stock.ts`, que
 * sirve en los dos modos.
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

    // Avisos al comprador en los dos cambios de estado que le importan.
    if (status === "Enviado") await sendOrderShipped(order as Order);
    if (status === "Cancelado") await sendOrderCancelled(order as Order);

    return Response.json({ ok: true, status });
  }

  const action = body?.action;

  /* ---------- Acciones administrativas que tocan stock ---------- */
  const items = (order.items ?? []).map((i: { productId: number; size: string; qty: number }) => ({
    productId: i.productId,
    size: i.size,
    qty: i.qty,
  }));

  if (action === "cancel") {
    if (order.status === "Cancelado") {
      return Response.json({ ok: true, action: "cancel", unchanged: true });
    }

    const restored = await restoreOrderStock(order as Order, "cancelación");
    if (!restored.ok) {
      return Response.json({ error: restored.error ?? "No pudimos reponer el stock." }, { status: 500 });
    }

    const ok = await updateOrderStatus(id, "Cancelado");
    if (!ok) return Response.json({ error: "No pudimos cancelar el pedido." }, { status: 500 });

    await sendOrderCancelled(order as Order);

    return Response.json({ ok: true, action: "cancel" });
  }

  if (action === "restock") {
    if (order.status !== "Cancelado") {
      return Response.json(
        { error: "Sólo se puede reponer el stock de un pedido cancelado." },
        { status: 400 },
      );
    }

    const committed = await commitStock(items);
    if (!committed.ok) {
      return Response.json({ error: committed.detail }, { status: 409 });
    }

    const ok = await updateOrderStatus(id, "Pendiente de confirmación");
    if (!ok) return Response.json({ error: "No pudimos actualizar el pedido." }, { status: 500 });

    return Response.json({ ok: true, action: "restock" });
  }

  return Response.json(
    { error: `Envía { status } con uno de: ${ORDER_STATUSES.join(", ")}.` },
    { status: 400 },
  );
}

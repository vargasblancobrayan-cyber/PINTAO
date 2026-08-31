import { getDb } from "./db";
import { products } from "./products";
import {
  addOrder as memAddOrder,
  addQuote as memAddQuote,
  subscribeNewsletter as memSubscribeNewsletter,
  getOrders as memGetOrders,
  getQuotes as memGetQuotes,
  getCustomerOrders as memGetCustomerOrders,
  findOrderById as memFindOrderById,
  updateOrderPayment as memUpdateOrderPayment,
  updateOrderStatus as memUpdateOrderStatus,
} from "./server-store";
import type { Order, Quote } from "./types";

/**
 * Capa de persistencia unificada.
 *
 * - Con Supabase (producción): Postgres real + decremento atómico de stock.

 * - Sin Supabase (dev/demo): store en memoria existente.
 *
 * Las rutas API NO cambian su interfaz: siempre llaman a estas funciones..
 */

export interface CreateOrderResult {
  order: Order;
  ok: boolean;
  error?: string;
}

/** Persiste un pedido y descuenta stock atómicamente. */
export async function createOrder(order: Order): Promise<CreateOrderResult> {
  const db = getDb();
  if (!db) {
    memAddOrder(order);
    return { order, ok: true };
  }

  const { error: rpcError } = await db.rpc("decrement_stock", {
    p_items: order.items.map((i) => ({
      productId: i.productId,
      size: i.size,
      qty: i.qty,
    })),
  });

  if (rpcError) {
    const msg = String(rpcError.message ?? "");
    if (msg.includes("INSUFFICIENT_STOCK")) {
      return { order, ok: false, error: "Stock insuficiente para uno de los productos. Actualiza el carrito." };
    }
    return { order, ok: false, error: "No pudimos actualizar el inventario. Intenta de nuevo." };
  }

  const { error } = await db.from("pintao_orders").insert({
    id: order.id,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    volume_discount: order.volumeDiscount,
    coupon: order.coupon ?? null,
    coupon_discount: order.couponDiscount,
    shipping: order.shipping,
    total: order.total,
    payment_method: order.paymentMethod,
    status: order.status,
    address: order.address ?? null,
    shipping_method: order.shippingMethod,
    created_at: order.createdAt,
  });

  if (error) return { order, ok: false, error: "No pudimos guardar el pedido. Intenta de nuevo." };

  return { order, ok: true };
}

/** Persiste una cotización mayorista. */
export async function createQuote(quote: Quote): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    memAddQuote(quote);
    return { ok: true };
  }

  const { error } = await db.from("pintao_quotes").insert({
    id: quote.id,
    name: quote.name,
    phone: quote.phone,
    quantity: quote.quantity ?? null,
    message: quote.message ?? null,
    status: quote.status,
    created_at: quote.createdAt,
  });

  if (error) return { ok: false, error: "No pudimos guardar la cotización. Intenta de nuevo." };
  return { ok: true };
}

/** Suscribe un correo a la newsletter. */
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    memSubscribeNewsletter(email);
    return { ok: true };
  }

  const { error } = await db.from("pintao_newsletter").upsert(
    { email: email.toLowerCase().trim(), created_at: new Date().toISOString() },
    { onConflict: "email" },
  );

  if (error) return { ok: false, error: "No pudimos registrar el correo. Intenta de nuevo." };
  return { ok: true };
}

function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    customer: row.customer,
    items: row.items,
    subtotal: Number(row.subtotal),
    volumeDiscount: Number(row.volume_discount ?? 0),
    coupon: row.coupon ?? undefined,
    couponDiscount: Number(row.coupon_discount ?? 0),
    shipping: Number(row.shipping ?? 0),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    status: row.status,
    address: row.address ?? undefined,
    shippingMethod: row.shipping_method,
    createdAt: row.created_at,
  };
}

/** Lista todos los pedidos (admin). */
export async function getAllOrders(): Promise<Order[]> {
  const db = getDb();
  if (!db) return memGetOrders();

  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapRowToOrder);
}

/** Lista pedidos de un cliente por correo. */
export async function getOrdersForCustomer(email: string): Promise<Order[]> {
  const db = getDb();
  if (!db) return memGetCustomerOrders(email);

  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .eq("customer->>email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapRowToOrder);
}

/** Lista cotizaciones (admin). */
export async function getQuotes(): Promise<Quote[]> {
  const db = getDb();
  if (!db) return memGetQuotes();

  const { data, error } = await db
    .from("pintao_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    quantity: row.quantity ?? "",
    message: row.message ?? "",
    status: row.status,
    createdAt: row.created_at,
  }));
}

/** Busca un pedido por id (BD con fallback memoria. */
export async function findOrderById(id: string): Promise<Order | null> {
  const db = getDb();
  if (!db) return memFindOrderById(id) ?? null;

  const { data, error } = await db.from("pintao_orders").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapRowToOrder(data);
}

/**
 * Actualiza el estado de pago de una orden tras el webhook de Wompi.
 *
 * - BD: update condicional en pintao_orders (payment_status,, wompi_transaction_id,, paid_at).
 * - Memoria: muta la orden en server-store..
 */
export async function updateOrderPayment(
  id: string,
  paymentStatus: string,
  wompiTransactionId?: string,
): Promise<Order | null> {
  const db = getDb();
  if (!db) return memUpdateOrderPayment(id, paymentStatus, wompiTransactionId);

  const patch: Record<string, unknown> = {
    payment_status: paymentStatus,
  };
  if (wompiTransactionId) patch.wompi_transaction_id = wompiTransactionId;
  if (paymentStatus === "APPROVED") {
    patch.paid_at = new Date().toISOString();
    patch.status = "Pagado";
  }

  const { data, error } = await db
    .from("pintao_orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToOrder(data);
}

/** Recupera un producto con stock actualizado desde la BD. */
export async function getProductWithLiveStock(id: number): Promise<(typeof products)[number] | null> {
  const db = getDb();
  if (!db) return products.find((p) => p.id === id) ?? null;

  const { data, error } = await db
    .from("pintao_store")
    .select("data")
    .eq("id", 1)
    .single();

  if (error || !data) return products.find((p) => p.id === id) ?? null;
  const remoteProducts: any[] = data?.data?.products ?? [];
  const live = remoteProducts.find((p) => p.id === id);
  if (!live) return products.find((p) => p.id === id) ?? null;

  const local = products.find((p) => p.id === id) ?? null;
  if (!local) return null;

  return {
    ...local,
    stock: live.variants.reduce((sum: number, v: any) => sum + Number(v?.stock ?? 0), 0),
    variants: (live.variants ?? []).map((v: any) => ({
      size: String(v.size),
      color: String(v.color),
      stock: Number(v.stock ?? 0),
      sku: String(v.sku ?? ""),
    })),
  };
}

/** Actualiza el estado administrativo de una orden (BD con fallback memoria. */
export async function updateOrderStatus(id: string, status: string): Promise<Order | null> {
  const db = getDb();
  if (!db) return memUpdateOrderStatus(id, status);

  const { data, error } = await db
    .from("pintao_orders")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToOrder(data);
}
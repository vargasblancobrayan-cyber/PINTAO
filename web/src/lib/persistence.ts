import crypto from "crypto";
import { getDb } from "./db";
import { getActiveProducts, getProductById } from "./products";
import {
  addOrder as addOrderToMemory,
  addQuote as addQuoteToMemory,
  getOrders as getMemoryOrders,
  getQuotes as getMemoryQuotes,
  getCustomerOrders as getMemoryCustomerOrders,
  findOrderById as findMemoryOrderById,
  updateOrderPayment as updateMemoryOrderPayment,
  updateOrderStatus as updateMemoryOrderStatus,
} from "./server-store";
import type { Order, Quote, Product } from "./types";

/**
 * Capa de persistencia unificada.
 *
 * Con Supabase configurado (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) escribe
 * en Postgres. Sin credenciales cae al **store en memoria** de `server-store.ts`,
 * que es el modo de desarrollo/demo.
 *
 * Importante: el fallback en memoria debe **guardar** de verdad. Antes varias
 * funciones devolvían `ok: true` o `[]` sin escribir/leer nada, así que los
 * pedidos del checkout desaparecían: el historial de `/cuenta` y el panel
 * `/admin` siempre salían vacíos en local.
 */
export interface CreateOrderResult {
  order: Order;
  ok: boolean;
  error?: string;
}

export async function createOrder(order: Order): Promise<CreateOrderResult> {
  const db = getDb();
  if (!db) {
    addOrderToMemory(order);
    return { order, ok: true };
  }

  const { error } = await db.from("pintao_orders").insert({
    id: order.id,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    volume_discount: order.volume_discount ?? 0,
    coupon: order.coupon ?? null,
    coupon_discount: order.coupon_discount ?? 0,
    shipping: order.shipping,
    total: order.total,
    payment_method: order.paymentMethod,
    status: order.status,
    address: order.address ?? null,
    shipping_method: order.shippingMethod,
    created_at: order.createdAt,
  });

  if (error) return { order, ok: false, error: "No pudimos guardar el pedido" };
  return { order, ok: true };
}

function mapRowToOrder(row: any): Order {
  return {
    id: row.id,
    customer: row.customer,
    items: row.items,
    subtotal: Number(row.subtotal),
    volume_discount: Number(row.volume_discount ?? 0),
    coupon: row.coupon ?? undefined,
    coupon_discount: Number(row.coupon_discount ?? 0),
    shipping: Number(row.shipping ?? 0),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    status: row.status,
    address: row.address ?? undefined,
    shippingMethod: row.shipping_method,
    createdAt: row.created_at,
  };
}

export async function getAllOrders(): Promise<Order[]> {
  const db = getDb();
  if (!db) return getMemoryOrders();
  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getOrdersForCustomer(email: string): Promise<Order[]> {
  const db = getDb();
  if (!db) return getMemoryCustomerOrders(email.toLowerCase().trim());
  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .eq("customer->>email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Order;
}

export async function deleteOrder(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.from("pintao_orders").delete().eq("id", id);
}

export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
  const db = getDb();
  if (!db) return updateMemoryOrderStatus(id, status) !== null;
  const { error } = await db
    .from("pintao_orders")
    .update({ status })
    .eq("id", id);

  return error ? false : true;
}

export async function updateOrderPayment(
  id: string,
  paymentStatus: string,
  wompiTransactionId?: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return updateMemoryOrderPayment(id, paymentStatus, wompiTransactionId) !== null;

  const patch: Record<string, unknown> = {
    payment_status: paymentStatus,
  };
  if (wompiTransactionId) patch.wompi_transaction_id = wompiTransactionId;
  if (paymentStatus === "APPROVED") {
    patch.paid_at = new Date().toISOString();
    patch.status = "Pagado";
  }

  const { error } = await db
    .from("pintao_orders")
    .update(patch)
    .eq("id", id);

  return error ? false : true;
}

export async function createPaymentAttempt(
  orderId: string,
  result: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR"
): Promise<boolean> {
  const db = getDb();
  if (!db) return true; // modo demo: no se auditan intentos
  const { error } = await db.from("pintao_payment_attempts").insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    result,
    created_at: new Date().toISOString(),
  });
  return error ? false : true;
}

export async function getProducts(): Promise<Product[]> {
  const db = getDb();
  if (!db) return getActiveProducts();
  const { data, error } = await db
    .from("pintao_store")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  if (error) return getActiveProducts();
  const remoteProducts: any[] = data?.data?.products ?? [];
  if (remoteProducts.length === 0) return getActiveProducts();
  // Las tallas/stock viven en las variantes locales: el JSONB remoto sólo
  // guarda el catálogo base. Antes se sumaba `p.variants` (siempre undefined).
  return remoteProducts.map((p: any) => {
    const localVariants = getProductById(Number(p.id))?.variants ?? [];
    return {
      ...p,
      variants: localVariants,
      stock: localVariants.reduce((sum, v) => sum + (v?.stock ?? 0), 0),
    };
  });
}

export async function createProduct(product: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  // Lee el catálogo actual antes de añadir (antes se hacía un spread sobre una
  // promesa, que colapsaba a `[]` y borraba todo el catálogo guardado).
  const { data } = await db.from("pintao_store").select("data").eq("id", 1).maybeSingle();
  const current = Array.isArray(data?.data?.products) ? data.data.products : [];
  const { error } = await db.from("pintao_store").upsert({
    id: 1,
    data: { products: [...current, product] },
  });
  return !error;
}

export async function deleteProduct(id: number): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { data } = await db.from("pintao_store").select("*").eq("id", 1).maybeSingle();
  const current = data?.data?.products ?? [];
  const updated = current.filter((p: any) => p.id !== id);
  const { error } = await db.from("pintao_store").upsert({
    id: 1,
    data: { products: updated },
  });
  return !error;
}

export async function getQuotes(): Promise<Quote[]> {
  const db = getDb();
  if (!db) return getMemoryQuotes();
  const { data, error } = await db
    .from("pintao_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function createQuote(quote: Quote): Promise<boolean> {
  const db = getDb();
  if (!db) {
    addQuoteToMemory(quote);
    return true;
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
  return !error;
}

export async function createInvoice(invoice: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_invoices").insert(invoice);
  return !error;
}

export async function createFilingAudit(audit: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_filing_audit").insert(audit);
  return !error;
}

export async function createStockMovement(movement: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_stock_movements").insert(movement);
  return !error;
}

export async function createDimension(dimension: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_dimensions").insert(dimension);
  return !error;
}

export async function createOrderTracking(tracking: any): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_order_tracking").insert(tracking);
  return !error;
}

export async function getOrderTracking(orderId: string): Promise<any | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("pintao_order_tracking")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function updateOrderTracking(orderId: string, estado: string, observacion?: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db
    .from("pintao_order_tracking")
    .update({ estado, observacion, updated_at: new Date().toISOString() })
    .eq("order_id", orderId);

  return !error;
}

export async function getStats(): Promise<{ products: number; stock: number; orders: number; revenue: number; pending: number }> {
  const db = getDb();
  if (!db) return { products: 0, stock: 0, orders: 0, revenue: 0, pending: 0 };
  const { data, error } = await db.rpc("get_stats");
  if (error || !data || data.length === 0) return { products: 0, stock: 0, orders: 0, revenue: 0, pending: 0 };
  return data[0] as { products: number; stock: number; orders: number; revenue: number; pending: number };
}

export async function getAdminUser(email: string): Promise<any | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("pintao_admin_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function createAdminUser(user: { id: string; email: string; password_hash: string; role: string }): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const { error } = await db.from("pintao_admin_users").insert({
    id: user.id,
    email: user.email.toLowerCase().trim(),
    password_hash: user.password_hash,
    role: user.role,
    created_at: new Date().toISOString(),
  });
  return !error;
}

export async function updateAdminUserPassword(id: string, password_hash: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const { error } = await db
    .from("pintao_admin_users")
    .update({ password_hash })
    .eq("id", id);
  return !error;
}

export async function getUserOrders(email: string): Promise<Order[]> {
  const db = getDb();
  if (!db) return [];
  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .eq("customer->>email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getSession(token: string): Promise<any | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("pintao_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function findOrderById(id: string): Promise<Order | null> {
  const db = getDb();
  if (!db) return findMemoryOrderById(id) ?? null;

  const { data, error } = await db
    .from("pintao_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToOrder(data);
}

export async function findPaymentAttempt(orderId: string): Promise<{ ok: boolean; attempt?: any; error?: string }> {
  const db = getDb();
  if (!db) {
    // Modo demo: el único "intento" fiable es el estado real del pedido. Antes
    // se fabricaba un intento APPROVED para cualquier pedido existente, lo que
    // bloqueaba el pago en línea con un falso "ya fue pagado".
    const order = findMemoryOrderById(orderId);
    if (!order) return { ok: true, attempt: null };
    if (order.status === "Pagado") {
      return { ok: true, attempt: { order_id: order.id, result: "APPROVED", created_at: order.createdAt } };
    }
    return { ok: true, attempt: null };
  }

  const { data, error } = await db
    .from("pintao_payment_attempts")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return { ok: false, error: "No pudimos consultar intentos de pago" };

  if (!data || data.length === 0) {
    return { ok: true, attempt: null };
  }

  return { ok: true, attempt: data[0] };
}

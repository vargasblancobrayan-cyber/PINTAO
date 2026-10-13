import { getDb } from "./db";
import { getProductById, products } from "./products";
import type { SupabaseClient } from "./db";

/**
 * Inventario: descuento y reposición de stock.
 *
 * Contexto (AUDIT.md §6.4): el RPC `decrement_stock` existía desde la migración
 * `202608290001_persistencia_pedidos_stock.sql`, pero **ningún endpoint lo
 * llamaba**, así que vender no bajaba el inventario de `pintao_store` y se podía
 * vender el mismo stock muchas veces. Aquí vive la única puerta a ese RPC.
 *
 * Dos modos, como el resto de la capa de datos:
 * - **Supabase**: `decrement_stock` / `increment_stock` (atómicos: `FOR UPDATE` +
 *   update condicional en la misma transacción). El RPC es la autoridad final:
 *   si dice que no hay stock, el pedido no se crea aunque el catálogo local diga
 *   otra cosa.
 * - **Memoria** (dev/demo sin credenciales): se mutan las variantes del catálogo
 *   del proceso, de modo que el comportamiento se pueda probar sin base de datos.
 *
 * El catálogo sigue sirviéndose desde `lib/products.ts`, así que en modo Supabase
 * la ficha de producto puede mostrar un stock ya agotado; el pedido se rechaza
 * igualmente al confirmar (ver TESTING.md, limitaciones).
 */

export interface StockItem {
  productId: number;
  size: string;
  qty: number;
}

export type StockFailureReason = "insufficient" | "unavailable" | "error";

export type StockResult =
  | { ok: true; tracked: boolean }
  | { ok: false; reason: StockFailureReason; detail: string };

const INSUFFICIENT = "INSUFFICIENT_STOCK";
const STORE_MISSING = "STORE_NOT_FOUND";
const PRODUCT_MISSING = "PRODUCT_NOT_FOUND";

function normalizeItems(items: StockItem[]): StockItem[] {
  return items
    .filter((i) => i && Number.isFinite(Number(i.productId)) && Number(i.qty) > 0)
    .map((i) => ({ productId: Number(i.productId), size: String(i.size), qty: Number(i.qty) }));
}

/* -------------------------------------------------------------------------- */
/* Modo memoria                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Aplica un delta (±qty) sobre las variantes del catálogo en memoria.
 *
 * Valida **todo** el pedido antes de tocar nada: si una sola línea no tiene
 * stock suficiente, no se descuenta ninguna (antes sería posible dejar el
 * catálogo a medias).
 */
function applyMemoryDelta(items: StockItem[], sign: 1 | -1): StockResult {
  const target: { variant: { stock: number }; product: (typeof products)[number] }[] = [];

  for (const item of items) {
    const product = getProductById(item.productId);
    const variant = product?.variants.find((v) => v.size === item.size);
    if (!product || !variant) {
      return {
        ok: false,
        reason: "unavailable",
        detail: `El producto ${item.productId} (talla ${item.size}) no existe en el catálogo.`,
      };
    }
    if (sign === -1 && variant.stock < item.qty) {
      return {
        ok: false,
        reason: "insufficient",
        detail: `Stock insuficiente. Solo ${variant.stock} unidades disponibles de ${product.name} en talla ${item.size}.`,
      };
    }
    target.push({ variant, product });
  }

  target.forEach((entry, index) => {
    entry.variant.stock += sign * items[index].qty;
    entry.product.stock = entry.product.variants.reduce((sum, v) => sum + v.stock, 0);
  });

  return { ok: true, tracked: true };
}

/* -------------------------------------------------------------------------- */
/* Modo Supabase                                                              */
/* -------------------------------------------------------------------------- */

function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) return String((error as { message: unknown }).message ?? "");
  return String(error);
}

function toStoreProduct(product: (typeof products)[number]) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    category: product.category,
    color: product.color,
    sizes: product.sizes,
    stock: product.stock,
    img: product.img,
    gallery: product.gallery,
    description: product.description,
    variants: product.variants,
    tag: product.tag,
    active: product.active,
  };
}

/**
 * Asegura que `pintao_store.data.products` tenga variantes con stock.
 *
 * `decrement_stock` opera sobre ese JSONB. Cuando la fila está vacía (o los
 * productos remotos no traen variantes) el RPC falla con `STORE_NOT_FOUND` /
 * `PRODUCT_NOT_FOUND`: se siembra el catálogo desde `lib/products.ts` y se
 * reintenta una vez. Devuelve `true` si escribió algo.
 */
async function ensureStoreSeeded(db: SupabaseClient): Promise<boolean> {
  const { data } = await db.from("pintao_store").select("data").eq("id", 1).maybeSingle();
  const remote: any[] = Array.isArray(data?.data?.products) ? data.data.products : [];

  let changed = false;
  const merged = remote.map((row) => {
    const local = getProductById(Number(row?.id));
    if (local && !Array.isArray(row?.variants)) {
      changed = true;
      return { ...row, sizes: local.sizes, variants: local.variants };
    }
    return row;
  });

  if (remote.length === 0) {
    changed = true;
    merged.push(...products.map(toStoreProduct));
  }

  if (!changed) return false;

  const { error } = await db.from("pintao_store").upsert({ id: 1, data: { products: merged } });
  return !error;
}

async function rpcOnce(db: SupabaseClient, fn: "decrement_stock" | "increment_stock", items: StockItem[]) {
  const payload = items.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty }));
  return fn === "decrement_stock"
    ? db.rpc("decrement_stock", { p_items: payload })
    : db.rpc("increment_stock", { p_items: payload });
}

async function runStockRpc(
  db: SupabaseClient,
  fn: "decrement_stock" | "increment_stock",
  items: StockItem[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  let { error } = await rpcOnce(db, fn, items);
  let message = errorMessage(error);

  if (error && (message.includes(STORE_MISSING) || message.includes(PRODUCT_MISSING))) {
    const seeded = await ensureStoreSeeded(db);
    if (seeded) {
      const retry = await rpcOnce(db, fn, items);
      error = retry.error;
      message = errorMessage(error);
    }
  }

  return error ? { ok: false, message } : { ok: true };
}

function mapFailure(message: string, items: StockItem[]): StockResult {
  if (message.includes(INSUFFICIENT)) {
    return {
      ok: false,
      reason: "insufficient",
      detail:
        "Stock insuficiente: otro cliente acaba de comprar las últimas unidades. " +
        "Ajusta las cantidades o escríbenos por WhatsApp.",
    };
  }
  if (message.includes(PRODUCT_MISSING)) {
    const id = message.split(PRODUCT_MISSING)[1]?.replace(/^_/, "") ?? "";
    const product = id ? getProductById(Number(id)) : undefined;
    return {
      ok: false,
      reason: "unavailable",
      detail: `El producto ${product?.name ?? id} ya no está disponible en el inventario.`,
    };
  }
  if (message.includes(STORE_MISSING)) {
    return {
      ok: false,
      reason: "error",
      detail: "El inventario no está publicado en la base de datos. Escríbenos por WhatsApp.",
    };
  }
  // Los items se incluyen sólo como contexto de diagnóstico del mensaje.
  return {
    ok: false,
    reason: "error",
    detail: `No pudimos reservar el inventario (${items.length} línea(s)). Intenta de nuevo.`,
  };
}

/* -------------------------------------------------------------------------- */
/* API pública                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Descuenta el stock del pedido. Se llama **después** de insertar el pedido: si
 * falla, quien la usa borra la fila (compensación) para no dejar un pedido sin
 * inventario reservado.
 */
export async function commitStock(items: StockItem[]): Promise<StockResult> {
  const clean = normalizeItems(items);
  if (clean.length === 0) return { ok: true, tracked: true };

  const db = getDb();
  if (!db) return applyMemoryDelta(clean, -1);

  const result = await runStockRpc(db, "decrement_stock", clean);
  if (result.ok) return { ok: true, tracked: true };
  return mapFailure(result.message, clean);
}

/** Repone el stock de un pedido cancelado (movimiento inverso). */
export async function releaseStock(items: StockItem[]): Promise<StockResult> {
  const clean = normalizeItems(items);
  if (clean.length === 0) return { ok: true, tracked: true };

  const db = getDb();
  if (!db) return applyMemoryDelta(clean, 1);

  const result = await runStockRpc(db, "increment_stock", clean);
  if (result.ok) return { ok: true, tracked: true };
  return {
    ok: false,
    reason: result.message.includes(PRODUCT_MISSING) ? "unavailable" : "error",
    detail: "No pudimos reponer el inventario.",
  };
}

/** Registro de auditoría por movimiento (best-effort: nunca bloquea la venta). */
export async function recordStockMovements(
  orderId: string,
  items: StockItem[],
  type: "DECREMENT" | "INCREMENT",
  reason?: string,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const clean = normalizeItems(items);
  if (clean.length === 0) return;

  await db.from("pintao_stock_movements").insert(
    clean.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      size: item.size,
      qty: item.qty,
      type,
      reason: reason ?? null,
    })),
  );
}

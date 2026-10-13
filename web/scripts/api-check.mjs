/*
 * Verificación de API de PINTAO (sin navegador).
 *
 * Cubre lo que el guion de navegador no puede comprobar directamente:
 *   - `Idempotency-Key`: repetir el POST devuelve el mismo pedido.
 *   - Descuento de stock al vender y rechazo cuando se agota.
 *   - Cancelación como administrador que **repone** el inventario (y no lo
 *     vuelve a descontar), idempotente al repetirse.
 *
 * Uso (servidor ya levantado, ver TESTING.md):
 *   npm run build
 *   PINTAO_ALLOW_DEMO_LOGIN=true npm start      # o: npm run dev
 *   node scripts/api-check.mjs                  # BASE configurable con PINTAO_BASE
 *
 * En modo demo el stock vive en memoria del proceso: reiniciar el servidor lo
 * devuelve a su valor inicial.
 */

const BASE = process.env.PINTAO_BASE ?? "http://127.0.0.1:3000";
const results = [];
let cookie = "";

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail: String(detail) });
}

async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const session = setCookie.find((c) => c.startsWith("pintao_session="));
  if (session) cookie = session.split(";")[0];

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* respuesta no JSON */
  }
  return { status: res.status, json, text };
}

function stockOf(products, id, size) {
  const product = products.find((p) => p.id === id);
  return product?.variants?.find((v) => v.size === size)?.stock ?? null;
}

async function readStock(id, size) {
  const res = await api("/api/products");
  return stockOf(res.json?.products ?? [], id, size);
}

const PRODUCT_ID = 9; // "Gorra Essential Negra", talla única, sin variantes de color
const SIZE = "ÚNICA";

const customer = { name: "Verificación API", email: "api-check@pintao.local", phone: "3000000000" };
const emptyCart = { customer, paymentMethod: "Transferencia", shippingMethod: "recoge", items: [] };

function orderBody(qty, extra = {}) {
  return {
    customer,
    paymentMethod: "Transferencia",
    shippingMethod: "recoge",
    items: [{ productId: PRODUCT_ID, size: SIZE, qty }],
    ...extra,
  };
}

/* ---------- 1. Estado inicial ---------- */
const initialStock = await readStock(PRODUCT_ID, SIZE);
check("stock: el catálogo responde y reporta inventario", typeof initialStock === "number", `${initialStock} unidades`);

/* ---------- 2. Pedido idempotente ---------- */
const key = `api-check-${Date.now()}`;
const first = await api("/api/orders", { method: "POST", body: orderBody(3), headers: { "Idempotency-Key": key } });
check("idempotencia: el pedido se registra (201)", first.status === 201 && Boolean(first.json?.id), `${first.status} ${first.json?.id ?? first.text.slice(0, 80)}`);

const afterFirst = await readStock(PRODUCT_ID, SIZE);
check(
  "stock: vender descuenta inventario",
  initialStock !== null && afterFirst === initialStock - 3,
  `${initialStock} → ${afterFirst}`,
);

const replay = await api("/api/orders", { method: "POST", body: orderBody(3), headers: { "Idempotency-Key": key } });
check(
  "idempotencia: repetir la clave devuelve el MISMO pedido",
  replay.json?.id === first.json?.id,
  `clave ${key}: ${first.json?.id} vs ${replay.json?.id}`,
);
const afterReplay = await readStock(PRODUCT_ID, SIZE);
check(
  "idempotencia: la repetición no descuenta stock otra vez",
  afterReplay === afterFirst,
  `${afterFirst} → ${afterReplay}`,
);

/* ---------- 3. Sin clave (compatibilidad) ---------- */
const noKey = await api("/api/orders", { method: "POST", body: orderBody(2) });
check(
  "sin Idempotency-Key: el pedido se registra como siempre",
  noKey.status === 201 && noKey.json?.id !== first.json?.id,
  `${noKey.status} ${noKey.json?.id ?? noKey.text.slice(0, 80)}`,
);

/* ---------- 4. Agotar el stock ---------- */
const remaining = await readStock(PRODUCT_ID, SIZE);
const drain = await api("/api/orders", { method: "POST", body: orderBody(remaining) });
check("stock: se puede comprar todo el inventario disponible", drain.status === 201, `${drain.status}`);

const exhausted = await api("/api/orders", { method: "POST", body: orderBody(1) });
const exhaustedMessage = exhausted.json?.error ?? exhausted.text;
check(
  "stock: comprar sin inventario se rechaza",
  exhausted.status === 400 || exhausted.status === 409,
  `${exhausted.status} ${String(exhaustedMessage).slice(0, 120)}`,
);
const afterExhausted = await readStock(PRODUCT_ID, SIZE);
check("stock: el rechazo no descuenta nada", afterExhausted === 0, `${afterExhausted} unidades`);

/* ---------- 5. Cancelación que repone ---------- */
const login = await api("/api/auth/login", {
  method: "POST",
  body: { email: "admin@pintao.local", password: "Pintao2026!" },
});
check("admin: inicio de sesión", login.status === 200 && login.json?.user?.role === "admin", `${login.status}`);

if (login.status === 200) {
  const cancelled = await api(`/api/admin/orders/${noKey.json.id}`, { method: "PATCH", body: { action: "cancel" } });
  const afterCancel = await readStock(PRODUCT_ID, SIZE);
  check(
    "cancelar: repone el stock del pedido (no lo descuenta)",
    cancelled.status === 200 && afterCancel === 2,
    `${cancelled.status} → ${afterCancel} unidades`,
  );

  const cancelledAgain = await api(`/api/admin/orders/${noKey.json.id}`, {
    method: "PATCH",
    body: { action: "cancel" },
  });
  const afterSecondCancel = await readStock(PRODUCT_ID, SIZE);
  check(
    "cancelar dos veces no repone inventario dos veces",
    cancelledAgain.json?.unchanged === true && afterSecondCancel === 2,
    `${afterSecondCancel} unidades`,
  );

  const restocked = await api(`/api/admin/orders/${noKey.json.id}`, { method: "PATCH", body: { action: "restock" } });
  const afterRestock = await readStock(PRODUCT_ID, SIZE);
  check(
    "reponer una cancelación vuelve a descontar el stock",
    restocked.status === 200 && afterRestock === 0,
    `${restocked.status} → ${afterRestock} unidades`,
  );

  const restockPending = await api(`/api/admin/orders/${first.json.id}`, {
    method: "PATCH",
    body: { action: "restock" },
  });
  check(
    "no se puede reponer el stock de un pedido no cancelado",
    restockPending.status === 400,
    `${restockPending.status}`,
  );
}

/* ---------- 6. Rate limit y CSRF siguen en pie ---------- */
const csrf = await api("/api/orders", {
  method: "POST",
  body: emptyCart,
  headers: { Origin: "https://atacante.example" },
});
check("CSRF: un origen ajeno se rechaza", csrf.status === 403, `${csrf.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`PINTAO API CHECK · ${results.length - failed.length}/${results.length} OK`);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} · ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
process.exit(failed.length === 0 ? 0 : 1);

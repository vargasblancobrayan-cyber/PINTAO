import { cookies } from "next/headers";
import { NextRequest, type NextResponse } from "next/server";

import { createOrder, getAllOrders, getOrdersForCustomer } from "@/lib/persistence";
import { getSession as getDbSession } from "@/lib/auth";
import type { Order, OrderItem } from "@/lib/types";
import { orderInputSchema } from "@/lib/validation";
import { computePricing } from "@/lib/pricing";
import { unitPriceWithDiscount } from "@/lib/format";
import { products } from "@/lib/products";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const ORDER_RATE_LIMIT = { windowMs: 60_000, max: 10 };

export async function POST(req: Request) {
const csrf = assertSameOrigin(req);
if (csrf) return csrf;

const ip = clientIp(req);
const limited = checkRateLimit(`order:${ip}`, ORDER_RATE_LIMIT);
if (!limited.ok) {
return Response.json(
{ error: "Demasiados pedidos. Espera un momento e inténtalo de nuevo." },
{ status: 429, headers: { "Retry-After": String(Math.ceil((limited.retryAfterMs ?? 60_000) / 1000)) } },
);
}

let body: unknown;
try {
body = await req.json();
} catch {
return Response.json({ error: "JSON inválido" }, { status: 400 });
}

const parsed = orderInputSchema.safeParse(body);
if (!parsed.success) {
const msg = parsed.error.issues[0]?.message ?? "Datos del pedido inválidos";
return Response.json({ error: msg }, { status: 400 });
}
const { customer, items, paymentMethod, shippingMethod, address, coupon } = parsed.data;

// Validar email del cliente (evitar inyección de SQL)
const customerEmail = String(customer.email ?? "").toLowerCase().trim();
if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
return Response.json({ error: "Correo electrónico inválido" }, { status: 400 });
}
customer.email = customerEmail;

// Validar teléfono (solo dígitos, mínimo 7 números)
const customerPhone = String(customer.phone ?? "").replace(/\D/g, "");
if (customerPhone.length < 7 || customerPhone.length > 20) {
return Response.json({ error: "Número de teléfono inválido" }, { status: 400 });
}
customer.phone = customerPhone;

// Validar nombre (necesario incluirlo aquí porque el schema ya valida pero es buena práctica reforzar)
const customerName = String(customer.name ?? "").trim().slice(0, 80);
if (customerName.length < 2) {
return Response.json({ error: "Nombre del cliente inválido" }, { status: 400 });
}
customer.name = customerName;

if (shippingMethod !== "recoge" && !address) {
return Response.json(
{ error: "La dirección es obligatoria para envíos." },
{ status: 400 },
);
}

// Recalcular precios y totales en el servidor (nunca confiar en datos del cliente).
const totalQty = items.reduce((n, i) => n + i.qty, 0);
let subtotal = 0;
const orderItems: OrderItem[] = [];
for (const { productId, size, qty } of items) {
const product = products.find((p) => p.id === productId && p.active);
const variant = product?.variants.find((v) => v.size === size);
if (!product || !variant) {
return Response.json(
{ error: `Variante no válida para el producto ${product?.name ?? "desconocido"}` },
{ status: 400 },
);
}
if (variant.stock < qty) {
return Response.json(
{ error: `Stock insuficiente. Solo ${variant.stock} unidades disponibles de ${product.name} en talla ${size}.` },
{ status: 400 },
);
}
const unit = unitPriceWithDiscount(product.price, totalQty);
subtotal += product.price * qty;
orderItems.push({
productId,
name: product.name,
size,
qty,
unitPrice: unit,
});
}

const pricing = computePricing({ subtotal, totalQty, couponCode: coupon, shippingMethod });

const finalAddress = shippingMethod === "recoge" ? undefined : address;

const order: Order = {
id: `PNT-${Date.now().toString(36).toUpperCase()}`,
customer,
items: orderItems,
subtotal,
volume_discount: pricing.volumeDiscount,
coupon: pricing.coupon?.code,
coupon_discount: pricing.couponDiscount,
shipping: pricing.shipping,
total: pricing.total,
paymentMethod,
status: "Pendiente de confirmación",
shippingMethod,
address: finalAddress,
createdAt: new Date().toISOString(),
};
const result = await createOrder(order);
if (!result.ok) {
return Response.json({ error: result.error ?? "No pudimos registrar el pedido." }, { status: 400 });
}
return Response.json({ id: order.id, order }, { status: 201 });
}

/** Para el flujo del checkout y el historial de la cuenta (admin o cliente). */
export async function GET(request: Request) {
const cookieStore = await cookies();
const user = await getDbSession(cookieStore.get("pintao_session")?.value);
if (!user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
if (user.role === "admin") {
const all = await getAllOrders();
return Response.json({ orders: all });
}
return Response.json({ orders: await getOrdersForCustomer(user.email) });
}

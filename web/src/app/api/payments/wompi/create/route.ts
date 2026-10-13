
import { createWompiTransaction, getMerchant, getWompiConfig } from "@/lib/wompi";
import { findOrderById, updateOrderPayment, findPaymentAttempt, createPaymentAttempt } from "@/lib/persistence";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";
import { beginIdempotent } from "@/lib/idempotency";

export const runtime = "nodejs";

const CREATE_RATE_LIMIT = { windowMs: 60_000, max: 20 };

export async function POST(req: Request) {
const csrf = assertSameOrigin(req);
if (csrf) return csrf;

const config = getWompiConfig();
if (!config.enabled) {
return Response.json(
{ error: "El pago en línea no está disponible. Usa otro método." },
{ status: 503 },
);
}

const ip = clientIp(req);
const limited = checkRateLimit(`wompi-create:${ip}`, CREATE_RATE_LIMIT);
if (!limited.ok) {
return Response.json(
{ error: "Demasiadas solicitudes. Espera un momento." },
{ status: 429 },
);
}

let body: { orderId?: string };
try {
body = await req.json();
} catch {
return Response.json({ error: "JSON inválido" }, { status: 400 });
}

const orderId = String(body?.orderId ?? "").trim();
if (!orderId) return Response.json({ error: "orderId es obligatorio" }, { status: 400 });

const order = await findOrderById(orderId);
if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });

/*
 * Idempotencia por pedido: el checkout reutiliza la misma clave del pedido, de
 * modo que un reintento devuelve **el mismo enlace de pago** en lugar de crear
 * una segunda transacción en Wompi (`orderId` acota el alcance de la clave).
 */
const decision = await beginIdempotent(req, `wompi-create:${orderId}`);
if (decision.state === "replay") {
return Response.json(decision.body, { status: decision.status });
}
if (decision.state === "in_flight") {
return Response.json(
{ error: "Ya estamos preparando este pago. Espera un momento." },
{ status: 409 },
);
}

// Verificar si el pedido ya fue pagado (evitar duplicados). Nos fiamos del
// estado real del pedido: un intento PENDING no significa que esté pagado.
const existingAttempt = await findPaymentAttempt(orderId);
const paidAttempt = existingAttempt.ok && existingAttempt.attempt?.result === "APPROVED";
if (paidAttempt || order.status === "Pagado" || order.status === "Completado") {
const payload = { error: "Este pedido ya fue pagado. No se puede realizar otro pago." };
await decision.complete(409, payload);
return Response.json(payload, { status: 409 });
}

if (order.status !== "Pendiente de confirmación" && order.status !== "Pendiente") {
const payload = { error: "Este pedido ya no puede pagarse." };
await decision.complete(400, payload);
return Response.json(payload, { status: 400 });
}

const merchant = await getMerchant(config);
if (!merchant || !merchant.acceptanceToken) {
const payload = { error: "No pudimos preparar el pago. Intenta de nuevo." };
await decision.complete(502, payload);
return Response.json(payload, { status: 502 });
}

const reference = order.id;

const result = await createWompiTransaction(
config,
{
amountInCents: Math.round(order.total),
reference,
customerEmail: order.customer.email,
},
merchant.acceptanceToken,
);

if (!result.ok || !result.transaction) {
const payload = { error: result.error ?? "No pudimos crear el pago. Intenta de nuevo." };
await decision.complete(502, payload);
return Response.json(payload, { status: 502 });
}

const paymentLink = result.transaction.paymentLink || `https://checkout.wompi.co/l/${result.transaction.id}`;

/*
 * La transacción acaba de crearse: el cliente todavía NO ha pagado.
 *
 * Antes se registraba aquí un intento APPROVED y se marcaba el pedido como
 * "Pagado" (updateOrderPayment con APPROVED escribe status="Pagado"). Eso daba
 * por cobrado un pedido sin pago, y además bastaba con llamar a este endpoint
 * con un orderId existente. El único lugar autorizado para aprobar el pago es
 * el webhook, que valida la firma X-Event-Checksum. Aquí sólo dejamos
 * constancia de la transacción en estado pendiente.
 */
await createPaymentAttempt(orderId, "PENDING");
await updateOrderPayment(orderId, "PENDING", result.transaction.id);

const payment = {
paymentUrl: paymentLink,
reference,
transactionId: result.transaction.id,
amountInCents: result.transaction.amountInCents,
currency: result.transaction.currency,
};
await decision.complete(200, payment);
return Response.json(payment);
}

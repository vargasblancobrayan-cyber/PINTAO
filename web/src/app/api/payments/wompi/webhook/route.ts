
import { getWompiConfig, verifyWebhookSignature } from "@/lib/wompi";
import { findOrderById, updateOrderPayment, createPaymentAttempt } from "@/lib/persistence";

export const runtime = "nodejs";

/**
* POST /api/payments/wompi/webhook
*
* Recibe los eventos de Wompi (`transaction.updated`).
* Verifica la firma en el header `X-Event-Checksum` (SHA256 de campos firmados
* + timestamp + integrity secret). Si el resultado es APPROVED, marca el
* pedido como Pagado.
*
* Wompi reintenta enviar el evento hasta 3 veces si no respondemos 200.
*/
export async function POST(req: Request) {
const config = getWompiConfig();
if (!config.enabled) {
return Response.json({ error: "no configurado" }, { status: 503 });
}

const checksum = req.headers.get("x-event-checksum");
if (!checksum) {
return Response.json({ error: "checksum requerido" }, { status: 401 });
}

let body: any;
try {
body = await req.json();
} catch {
return Response.json({ error: "JSON inválido" }, { status: 400 });
}

const event = body?.event;
const signature = body?.signature;
const data = body?.data;
const transaction = data?.transaction;

if (event !== "transaction.updated" || !transaction?.id || !transaction?.reference) {
return Response.json({ ok: true }); // evento no relevante - ack para evitar reintentos
}

// --- Verificación de firma (autoritativa, server-to-server) ---
const timestamp = signature?.timestamp;
const signedFields = Array.isArray(signature?.properties)
? signature.properties.map((p: string) => {
// p puede ser "data.transaction.id" - resolver la ruta
const val = p.split(".").reduce((acc: any, k: string) => (acc == null ? acc : acc[k]), data);
return val == null ? "" : String(val);
})
: [transaction.id, transaction.reference, transaction.status, transaction.amount_in_cents, transaction.currency];

const valid = verifyWebhookSignature(
config.integritySecret,
checksum,
signedFields,
timestamp ?? "",
);

if (!valid) {
return Response.json({ error: "firma inválida" }, { status: 401 });
}

// Verificar que la referencia corresponda a un pedido nuestro (y el monto cuadre).
const order = await findOrderById(String(transaction.reference));
if (!order) {
return Response.json({ ok: true }); // pedido desconocido - ack
}

const status = String(transaction.status ?? "").toUpperCase();

if (status === "APPROVED") {
const amountOk = Number(transaction.amount_in_cents ?? transaction.amountInCents ?? 0) === Math.round(order.total);
if (!amountOk) {
return Response.json({ error: "monto no coincide" }, { status: 409 });
}
// Registrar intento APPROVED en la tabla de intentos
await createPaymentAttempt(order.id, "APPROVED");
await updateOrderPayment(order.id, "APPROVED", String(transaction.id));
} else if (["DECLINED", "VOIDED", "ERROR"].includes(status)) {
await updateOrderPayment(order.id, status, String(transaction.id));
}

return Response.json({ ok: true });
}

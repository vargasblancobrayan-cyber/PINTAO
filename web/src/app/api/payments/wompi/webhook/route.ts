import { NextResponse } from "next/server";
import { getWompiConfig, verifyWebhookSignature } from "@/lib/wompi";
import { findOrderById, updateOrderPayment } from "@/lib/persistence";

export const runtime = "nodejs";

/**
 * POST /api/payments/wompi/webhook
 *
 * Recibe los eventos de Wompi (`transaction.updated`).  Verifica la firma
 * en el header `X-Event-Checksum` (SHA256 de campos firmados + timestamp +
 * integrity secret). Si el evento es APPROVED, marca el pedido como Pagado#.
 *
 * Wompi reintenta hasta 3 veces en 24h si no respondemos 200.
 */
export async function POST(req: Request) {
  const config = getWompiConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: "no configurado" }, { status: 503 });
  }

  const checksum = req.headers.get("x-event-checksum");
  if (!checksum) {
    return NextResponse.json({ error: "checksum requerido" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = body?.event;
  const signature = body?.signature;
  const data = body?.data;
  const transaction = data?.transaction;

  if (event !== "transaction.updated" || !transaction?.id || !transaction?.reference) {
    return NextResponse.json({ ok: true }); // event no relevante—ack para evitar reintentos
  }

  // --- Verificación de firma (autoritativa, server-to-server) ---
  const timestamp = signature?.timestamp;
  const signedFields = Array.isArray(signature?.properties)
    ? signature.properties.map((p: string) => {
        // p puede ser "data.transaction.id" — resolver la ruta
        const val = p.split(".").reduce((acc: any, k: string) => (acc == null ? acc : acc[k]), data);
        return val == null ? "" : String(val);
      })
    : [transaction.id, transaction.reference, transaction.status, transaction.amount_in_cents, transaction.currency]
  const valid = verifyWebhookSignature(
    config.integritySecret,
    checksum,
    signedFields,
    timestamp ?? "",
  );

  if (!valid) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  // Verificar que la referencia corresponda a un pedido nuestro (y el monto cuadre).
  const order = await findOrderById(String(transaction.reference));
  if (!order) {
    return NextResponse.json({ ok: true }); // pedido desconocido—ack
  }

  const status = String(transaction.status ?? "").toUpperCase();

  if (status === "APPROVED") {
    const amountOk = Number(transaction.amount_in_cents ?? transaction.amountInCents ?? 0) === Math.round(order.total);
    if (!amountOk) {
      return NextResponse.json({ error: "monto no coincide" }, { status: 409 });
    }
    await updateOrderPayment(order.id, "APPROVED", String(transaction.id));
  } else if (["DECLINED", "VOIDED", "ERROR"].includes(status)) {
    await updateOrderPayment(order.id, status, String(transaction.id));
  }

  return NextResponse.json({ ok: true });
}
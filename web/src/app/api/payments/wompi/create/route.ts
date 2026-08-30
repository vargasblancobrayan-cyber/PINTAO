import { NextResponse } from "next/server";
import { createWompiTransaction, getMerchant, getWompiConfig } from "@/lib/wompi";
import { findOrderById, updateOrderPayment } from "@/lib/persistence";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const CREATE_RATE_LIMIT = { windowMs: 60_000, max: 20 };

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const config = getWompiConfig();
  if (!config.enabled) {
    return NextResponse.json(
      { error: "El pago en línea no está disponible. Usa otro método." },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const limited = checkRateLimit(`wompi-create:${ip}`, CREATE_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 },
    );
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const orderId = String(body?.orderId ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId es obligatorio" }, { status: 400 });

  const order = await findOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (order.status !== "Pendiente de confirmación" && order.status !== "Pendiente") {
    return NextResponse.json({ error: "Este pedido ya no puede pagarse." }, { status: 400 });
  }

  const merchant = await getMerchant(config);
  if (!merchant || !merchant.acceptanceToken) {
    return NextResponse.json(
      { error: "No pudimos preparar el pago. Intenta de nuevo." },
      { status: 502 },
    );
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
    return NextResponse.json(
      { error: result.error ?? "No pudimos crear el pago. Intenta de nuevo." },
      { status: 502 },
    );
  }


  const paymentLink = result.transaction.paymentLink || `https://checkout.wompi.co/l/${result.transaction.id}`;

  await updateOrderPayment(orderId, "PENDING", result.transaction.id);

  return NextResponse.json({
    paymentUrl: paymentLink,
    reference,
    transactionId: result.transaction.id,
    amountInCents: result.transaction.amountInCents,
    currency: result.transaction.currency,
  });
}

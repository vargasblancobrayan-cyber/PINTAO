import { NextResponse } from "next/server";
import { addQuote } from "@/lib/server-store";
import type { Quote } from "@/lib/types";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const QUOTE_RATE_LIMIT = { windowMs: 60_000, max: 5 };

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const limited = checkRateLimit(`${clientIp(req)}:quote`, QUOTE_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
  }

  const { name, phone, quantity, message } = await req.json();
  const cleanName = String(name ?? "").slice(0, 80);
  const cleanPhone = String(phone ?? "").replace(/\D/g, "").slice(0, 20);

  if (!cleanName || !cleanPhone) return NextResponse.json({ error: "Nombre y WhatsApp son obligatorios" }, { status: 400 });

  const quote: Quote = {
    id: `COT-${Date.now().toString(36).toUpperCase()}`,
    name: cleanName,
    phone: cleanPhone,
    quantity: String(quantity ?? ""),
    message: String(message ?? "").slice(0, 800),
    status: "Nueva",
    createdAt: new Date().toISOString(),
  };
  addQuote(quote);
  return NextResponse.json(quote, { status: 201 });
}

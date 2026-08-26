import { NextResponse } from "next/server";
import { addQuote } from "@/lib/server-store";
import type { Quote } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

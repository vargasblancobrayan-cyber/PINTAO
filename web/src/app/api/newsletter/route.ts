import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email } = await req.json();
  const clean = String(email ?? "").toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(clean)) return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
  subscribeNewsletter(clean);
  return NextResponse.json({ ok: true }, { status: 201 });
}

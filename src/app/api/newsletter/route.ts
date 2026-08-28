import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/server-store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const NEWSLETTER_RATE_LIMIT = { windowMs: 60_000, max: 5 };

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const limited = checkRateLimit(`${clientIp(req)}:newsletter`, NEWSLETTER_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json({ error: "Demasiados registros. Espera un momento." }, { status: 429 });
  }

  const { email } = await req.json();
  const clean = String(email ?? "").toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(clean)) return NextResponse.json({ error: "Escribe un correo válido" }, { status: 400 });
  subscribeNewsletter(clean);
  return NextResponse.json({ ok: true }, { status: 201 });
}

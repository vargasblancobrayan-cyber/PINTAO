import { NextResponse } from "next/server";
import { createSession, findUserByCredentials } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

const LOGIN_RATE_LIMIT = { windowMs: 60_000, max: 15 };

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  const limited = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429 },
    );
  }

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Correo y contraseña son obligatorios" }, { status: 400 });

  const user = await findUserByCredentials(String(email), String(password));
  if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const token = await createSession(user);
  const res = NextResponse.json({ user });
  res.cookies.set("pintao_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10,
  });
  return res;
}

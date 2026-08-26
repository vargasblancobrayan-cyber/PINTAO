import { NextResponse } from "next/server";
import { createSession, findUserByCredentials } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Correo y contraseña son obligatorios" }, { status: 400 });

  const user = findUserByCredentials(String(email), String(password));
  if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const token = createSession(user);
  const res = NextResponse.json({ user });
  res.cookies.set("pintao_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10,
  });
  return res;
}

import { cookies } from "next/headers";

import { SESSION_COOKIE, signIn } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";

export const runtime = "nodejs";

/** Freno a la fuerza bruta: 8 intentos por IP y minuto. */
const LOGIN_RATE_LIMIT = { windowMs: 60_000, max: 8 };

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const limited = checkRateLimit(`login:${clientIp(req)}`, LOGIN_RATE_LIMIT);
  if (!limited.ok) {
    return Response.json(
      { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = await signIn(String(body?.email ?? ""), String(body?.password ?? ""));
  if (!result.ok || !result.token || !result.user) {
    // Mensaje genérico: no revela si el correo existe.
    return Response.json({ error: result.error ?? "No pudimos iniciar sesión." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // `role` es indispensable: el formulario decide el destino del usuario
  // (`/admin` o `/cuenta`) y antes no venía en la respuesta, así que un
  // administrador acababa siempre en el panel de cliente.
  return Response.json({
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
  });
}

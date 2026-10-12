import { z } from "zod";

import { setSessionCookie, signUpCustomer } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Freno al alta masiva de cuentas: 5 por IP y minuto. */
const REGISTER_RATE_LIMIT = { windowMs: 60_000, max: 5 };

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(120)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ?? "").replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 7 && v.length <= 20), "WhatsApp inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export async function POST(req: Request) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const limited = checkRateLimit(`register:${clientIp(req)}`, REGISTER_RATE_LIMIT);
  if (!limited.ok) {
    return Response.json(
      { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." },
      { status: 400 },
    );
  }

  const result = await signUpCustomer(parsed.data);
  if (!result.ok || !result.user || !result.token) {
    // `email_taken` responde 409 para que el formulario distinga «ya existe»
    // de un error transitorio; `unavailable` indica que no hay BD en producción.
    const status = result.code === "email_taken" ? 409 : result.code === "unavailable" ? 503 : 400;
    return Response.json({ error: result.error ?? "No pudimos crear la cuenta." }, { status });
  }

  await setSessionCookie(result.token);

  return Response.json(
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    },
    { status: 201 },
  );
}

import { cookies } from "next/headers";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  // Sin cookie no hay nada que validar: 401 explícito en lugar de un contrato
  // de "refresh" que ninguna parte del sistema implementa.
  if (!token) return Response.json({ user: null }, { status: 401 });

  const user = await getSessionUser();
  if (!user) return Response.json({ user: null }, { status: 401 });

  return Response.json({ user });
}

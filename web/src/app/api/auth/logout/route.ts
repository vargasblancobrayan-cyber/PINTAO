import { cookies } from "next/headers";

import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
const cookieStore = await cookies();
const token = cookieStore.get("pintao_session")?.value;
// Invalidar la sesión en el backend (Supabase o memoria)
if (token) {
  await destroySession(token);
}
// Limpiar la cookie en el cliente
const res = Response.json({ ok: true });
// Limpiar la cookie manualmente (API de cookies de Next.js)
cookieStore.set("pintao_session", "", { expires: new Date(0), path: "/", sameSite: "lax" });
return res;
}

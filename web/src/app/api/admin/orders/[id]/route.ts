import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/persistence";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set(["Pendiente de confirmación", "Pagado", "Enviado", "Completado", "Cancelado"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = await getSession(cookieStore.get("pintao_session")?.value);
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (typeof status !== "string" || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Estado no permitido" }, { status: 400 });
  }

  const order = await updateOrderStatus(id, status);
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });


  return NextResponse.json({ order });
}
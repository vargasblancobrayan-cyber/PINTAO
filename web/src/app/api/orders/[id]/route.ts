import { cookies } from "next/headers";

import { findOrderById } from "@/lib/persistence";
import { getSession as getDbSession } from "@/lib/auth";

export const runtime = "nodejs";

/** Detalle de un pedido específico (solo el propietario o un admin). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
const { id } = await params;
if (!id) {
return Response.json({ error: "ID de pedido no proporcionado" }, { status: 400 });
}

const cookieStore = await cookies();
const user = await getDbSession(cookieStore.get("pintao_session")?.value);

if (!user) {
return Response.json({ error: "Sesión requerida" }, { status: 401 });
}

// Solo el propietario o un admin puede ver el pedido
const order = await findOrderById(id);
if (!order) {
return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
}

if (user.role !== "admin" && order.customer.email.toLowerCase() !== user.email.toLowerCase()) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

return Response.json({ order });
}

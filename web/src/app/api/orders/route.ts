import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addOrder, getSession, getCustomerOrders } from "@/lib/server-store";
import type { Order, OrderItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { customer, items, total, paymentMethod } = body as {
    customer: { name: string; email: string; phone: string };
    items: OrderItem[];
    total: number;
    paymentMethod: string;
  };

  if (!customer?.name || !customer?.email || !customer?.phone || !items?.length) {
    return NextResponse.json({ error: "Datos del pedido incompletos" }, { status: 400 });
  }

  const order: Order = {
    id: `PNT-${Date.now().toString(36).toUpperCase()}`,
    customer: {
      name: String(customer.name).slice(0, 80),
      email: String(customer.email).toLowerCase().trim(),
      phone: String(customer.phone).replace(/\D/g, "").slice(0, 20),
    },
    items,
    total: Number(total) || 0,
    paymentMethod: String(paymentMethod ?? "Transferencia"),
    status: "Pendiente de confirmación",
    createdAt: new Date().toISOString(),
  };
  addOrder(order);
  return NextResponse.json({ id: order.id, order }, { status: 201 });
}

/** Para el flujo del checkout y el historial de la cuenta. */
export async function GET() {
  const cookieStore = await cookies();
  const user = getSession(cookieStore.get("pintao_session")?.value);
  if (!user) return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ orders: [] });
  return NextResponse.json({ orders: getCustomerOrders(user.email) });
}

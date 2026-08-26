import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession, getOrders, getQuotes } from "@/lib/server-store";
import { getActiveProducts } from "@/lib/products";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const user = getSession(cookieStore.get("pintao_session")?.value);
  if (user?.role !== "admin") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const orders = getOrders();
  const quotes = getQuotes();
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return NextResponse.json({
    products: getActiveProducts().length,
    stock: getActiveProducts().reduce((sum, p) => sum + p.stock, 0),
    orders,
    quotes,
    revenue,
  });
}

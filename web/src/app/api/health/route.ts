import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/products";
import { getAllOrders } from "@/lib/persistence";

export const runtime = "nodejs";

export async function GET() {
  const orders = await getAllOrders();
  return NextResponse.json({ ok: true, products: getActiveProducts().length, orders: orders.length });
}

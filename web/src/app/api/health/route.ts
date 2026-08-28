import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/products";
import { getOrders } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, products: getActiveProducts().length, orders: getOrders().length });
}

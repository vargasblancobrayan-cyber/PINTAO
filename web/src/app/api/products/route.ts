import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/products";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ products: getActiveProducts() });
}


import { getActiveProducts } from "@/lib/products";

export const runtime = "nodejs";

export async function GET() {
return Response.json({ products: getActiveProducts() });
}

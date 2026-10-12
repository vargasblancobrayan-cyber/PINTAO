
import { getProduct } from "@/lib/products";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
const { id } = await params;
const product = getProduct(Number(id));
if (!product || !product.active) return Response.json({ error: "Producto no encontrado" }, { status: 404 });
return Response.json(product);
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addOrder, getSession, getCustomerOrders } from "@/lib/server-store";
import type { Order, OrderItem } from "@/lib/types";
import { orderInputSchema } from "@/lib/validation";
import { computePricing } from "@/lib/pricing";
import { unitPriceWithDiscount } from "@/lib/format";
import { products } from "@/lib/products";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = orderInputSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos del pedido inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { customer, items, paymentMethod, coupon } = parsed.data;

  // Recalcular precios y totales en el servidor (nunca confiar en datos del cliente).
  const totalQty = items.reduce((n, i) => n + i.qty, 0);
  let subtotal = 0;
  const orderItems: OrderItem[] = [];
  for (const { productId, size, qty } of items) {
    const product = products.find((p) => p.id === productId && p.active);
    const variant = product?.variants.find((v) => v.size === size);
    if (!product || !variant || variant.stock < qty) {
      return NextResponse.json(
        { error: `Stock insuficiente para ${product?.name ?? "un producto"}` },
        { status: 400 },
      );
    }
    const unit = unitPriceWithDiscount(product.price, totalQty);
    subtotal += product.price * qty;
    orderItems.push({
      productId,
      name: product.name,
      size,
      qty,
      unitPrice: unit,
    });
  }

  const pricing = computePricing({ subtotal, totalQty, couponCode: coupon });

  const order: Order = {
    id: `PNT-${Date.now().toString(36).toUpperCase()}`,
    customer,
    items: orderItems,
    subtotal,
    volumeDiscount: pricing.volumeDiscount,
    coupon: pricing.coupon?.code,
    couponDiscount: pricing.couponDiscount,
    shipping: pricing.shipping,
    total: pricing.total,
    paymentMethod,
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

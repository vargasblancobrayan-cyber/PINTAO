import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { getAllOrders } from "@/lib/persistence";

export const runtime = "nodejs";

function isAdmin(user: Awaited<ReturnType<typeof getSession>>) {
  return user?.role === "admin";
}

async function getRequestUser() {
  const cookieStore = await cookies();
  return getSession(cookieStore.get("pintao_session")?.value);
}

export async function GET() {
  const user = await getRequestUser();

  if (!user || !isAdmin(user)) {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const orders = await getAllOrders();

  const enriched = orders.map((o) => ({
    ...o,
    addressLine1: o.address?.line1 ?? "—",
    addressCity: o.address?.city ?? "—",
    addressRegion: o.address?.region ?? "—",
    shippingLabel: o.shippingMethod === "recoge"
      ? "Recoger en tienda"
      : o.shippingMethod === "expreso"
        ? "Envío exprés"
        : "Envío nacional",
    customerPhone: o.customer.phone,
    customerEmail: o.customer.email,
  }));

  return Response.json({ orders: enriched });
}

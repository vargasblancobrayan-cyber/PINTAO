
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import {
getAllProductsAdmin,
createProduct,
updateProductAdmin,
deleteProductAdmin,
} from "@/lib/admin-products";
;

export const runtime = "nodejs";

function isAdmin(user: Awaited<ReturnType<typeof getSession>>) {
return user?.role === "admin";
}

export async function GET(request: Request) {
const cookieStore = await cookies();
const user = await getSession(cookieStore.get("pintao_session")?.value);

if (!user || !isAdmin(user)) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

return Response.json({ products: getAllProductsAdmin() });
}

type ProductInput = {
id?: number;
name: string;
slug: string;
price: number;
category: string;
color: string;
sizes: string[];
stock: number;
img: string;
gallery: string[];
description: string;
tag: "NUEVO" | "DESTACADO";
active: boolean;
};

export async function POST(req: Request) {
const cookieStore = await cookies();
const user = await getSession(cookieStore.get("pintao_session")?.value);

if (!user || !isAdmin(user)) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

let body: unknown;
try {
body = await req.json();
} catch {
return Response.json({ error: "JSON inválido" }, { status: 400 });
}

const parsed = createProduct(body as ProductInput);
if (!parsed.ok) {
return Response.json({ error: parsed.error }, { status: 400 });
}

return Response.json({ product: parsed.product }, { status: 201 });
}

export async function PUT(req: Request) {
const cookieStore = await cookies();
const user = await getSession(cookieStore.get("pintao_session")?.value);

if (!user || !isAdmin(user)) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

let body: unknown;
try {
body = await req.json();
} catch {
return Response.json({ error: "JSON inválido" }, { status: 400 });
}

const id = Number((body as { id?: number }).id);
if (!id) return Response.json({ error: "id es obligatorio" }, { status: 400 });

const parsed = updateProductAdmin(id, body as Partial<ProductInput>);
if (!parsed.ok) {
return Response.json({ error: parsed.error }, { status: 400 });
}

return Response.json({ product: parsed.product });
}

export async function DELETE(req: Request) {
const cookieStore = await cookies();
const user = await getSession(cookieStore.get("pintao_session")?.value);

if (!user || !isAdmin(user)) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

const url = new URL(req.url);
const id = Number(url.searchParams.get("id"));
if (!id) return Response.json({ error: "id es obligatorio" }, { status: 400 });

const product = getAllProductsAdmin().find((p) => p.id === id);
if (!product || !product.active) {
return Response.json({ error: "Producto no encontrado" }, { status: 404 });
}

const ok = deleteProductAdmin(id);
if (!ok) {
return Response.json({ error: "No pudimos eliminar el producto" }, { status: 500 });
}

return Response.json({ ok: true });
}

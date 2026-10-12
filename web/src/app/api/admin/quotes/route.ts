
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { getQuotes, createQuote } from "@/lib/persistence";
import type { Quote } from "@/lib/types";
;

export const runtime = "nodejs";

function isAdmin(user: Awaited<ReturnType<typeof getSession>>) {
return user?.role === "admin";
}

function mapToQuote(row: any): Quote {
return {
id: row.id,
name: row.name,
phone: row.phone,
quantity: row.quantity ?? "",
message: row.message ?? "",
status: row.status,
createdAt: row.created_at,
};
}

export async function GET(request: Request) {
const cookieStore = await cookies();
const user = await getSession(cookieStore.get("pintao_session")?.value);

if (!user || !isAdmin(user)) {
return Response.json({ error: "Prohibido" }, { status: 403 });
}

const quotes = await getQuotes();
return Response.json({ quotes: quotes.map(mapToQuote) });
}

type QuoteInput = {
name: string;
phone: string;
quantity?: string;
message?: string;
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

const parsed = body as QuoteInput;
if (!parsed.name?.trim()) {
return Response.json({ error: "name es obligatorio" }, { status: 400 });
}
if (!parsed.phone?.trim()) {
return Response.json({ error: "phone es obligatorio" }, { status: 400 });
}

const quote: Quote = {
id: `QT-${Date.now().toString(36).toUpperCase()}`,
name: parsed.name.trim(),
phone: parsed.phone.trim(),
quantity: parsed.quantity?.trim() ?? "",
message: parsed.message?.trim() ?? "",
status: "PENDIENTE",
createdAt: new Date().toISOString(),
};

const ok = await createQuote(quote);
if (!ok) {
return Response.json({ error: "No pudimos guardar la cotización" }, { status: 500 });
}

return Response.json({ quote }, { status: 201 });
}

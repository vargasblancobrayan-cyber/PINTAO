import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  destroySession(cookieStore.get("pintao_session")?.value);
  return NextResponse.json({ ok: true });
}

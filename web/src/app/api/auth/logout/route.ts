import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  await destroySession(cookieStore.get("pintao_session")?.value);
  return NextResponse.json({ ok: true });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const user = getSession(cookieStore.get("pintao_session")?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

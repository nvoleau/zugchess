import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntitlementsForUser } from "@/lib/entitlements";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const entitlements = await getEntitlementsForUser(session.user.id);
  return NextResponse.json(entitlements);
}

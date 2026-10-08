import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlayerStats } from "@/lib/statsService";

/** GET /api/me/stats (SPEC.md) : Elo, XP, série, maîtrise par thème. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";

  const stats = await getPlayerStats(session.user.id, locale);
  return NextResponse.json(stats);
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTodaySession } from "@/lib/schedulerService";

/** GET /api/session/today (SPEC.md) : cartes dues et nouvelles positions de la séance du jour. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";

  const result = await getTodaySession(session.user.id, locale);
  return NextResponse.json(result);
}

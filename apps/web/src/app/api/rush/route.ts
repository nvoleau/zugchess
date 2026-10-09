import { QuotaExceededError } from "@zugchess/core";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startRun } from "@/lib/rushService";

/** POST /api/rush (chantier 4) : démarre une partie Zug Rush — consomme le quota du jour. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";

  try {
    const result = await startRun(session.user.id, locale);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: "quota_exceeded", kind: error.kind }, { status: 429 });
    }
    throw error;
  }
}

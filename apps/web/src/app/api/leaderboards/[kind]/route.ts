import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLeaderboard, type LeaderboardKind } from "@/lib/leaderboardService";

const VALID_KINDS: LeaderboardKind[] = ["rating", "xp", "streak"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kind } = await params;
  if (!VALID_KINDS.includes(kind as LeaderboardKind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // Chantier 4 : classement par famille (`Theme.family`) quand `kind=rating`.
  const family = new URL(request.url).searchParams.get("family") ?? undefined;
  const entries = await getLeaderboard(kind as LeaderboardKind, 20, { family });
  return NextResponse.json({ kind, family: family ?? null, entries });
}

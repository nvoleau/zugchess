import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRushLeaderboard, getRushPersonalRecord, type RushPeriod } from "@/lib/rushService";

const VALID_PERIODS: RushPeriod[] = ["day", "week", "all"];

/** GET /api/rush/leaderboard?period=day|week|all (chantier 4) : classement + record personnel. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const periodParam = new URL(request.url).searchParams.get("period");
  const period: RushPeriod = VALID_PERIODS.includes(periodParam as RushPeriod) ? (periodParam as RushPeriod) : "day";

  const [entries, record] = await Promise.all([
    getRushLeaderboard(period),
    getRushPersonalRecord(session.user.id),
  ]);

  return NextResponse.json({ period, entries, record });
}

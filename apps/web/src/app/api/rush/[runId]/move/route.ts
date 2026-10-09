import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { RushRunNotFoundError, submitMove } from "@/lib/rushService";

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const FEN_PATTERN = /^\S+ [wb] \S+ \S+ \d+ \d+$/;

const bodySchema = z.object({
  positionId: z.string().min(1),
  fenBefore: z.string().regex(FEN_PATTERN),
  uci: z.string().regex(UCI_PATTERN),
  stepIndex: z.number().int().min(0).optional(),
  heldSoFar: z.number().int().min(0).optional(),
  moveDurationsMs: z.array(z.number().int().min(0)),
});

/** POST /api/rush/[runId]/move (chantier 4) : juge un coup Zug Rush, conclut la position si besoin. */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";

  try {
    const result = await submitMove(session.user.id, runId, locale, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RushRunNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (error instanceof Error && (error.message === "illegal_move" || error.message === "not_found")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

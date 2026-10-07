import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { judgeKpkPositionMove, judgeLinePositionMove, judgeSyzygyPositionMove } from "@/lib/judgeService";
import { getPosition } from "@/lib/positionService";

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const bodySchema = z.object({
  uci: z.string().regex(UCI_PATTERN),
  /** Requis uniquement pour les positions `judgeType: "line"` — l'étape courante de la ligne. */
  stepIndex: z.number().int().min(0).optional(),
});

/**
 * POST /api/judge/:positionId (SPEC.md) : juge un coup pour une position de la bibliothèque. Le
 * client envoie le coup joué, le serveur rejoue et renvoie le verdict — seule source de vérité
 * (CLAUDE.md). Les positions `judgeType: "stockfish"` ne passent jamais par cette route : le
 * moteur tourne dans un worker côté navigateur (SPEC.md, « Stockfish WASM »).
 */
export async function POST(request: Request, { params }: { params: Promise<{ positionId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { positionId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { uci, stepIndex } = parsed.data;

  const position = await getPosition(positionId, "fr");
  if (!position) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    if (position.judgeType === "kpk") {
      return NextResponse.json(judgeKpkPositionMove(position.fen, uci));
    }

    if (position.judgeType === "line") {
      if (!position.methodLine || stepIndex === undefined) {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
      }
      const promotion = uci.slice(4) || undefined;
      const attempted = { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: promotion as "q" | "r" | "b" | "n" | undefined };
      return NextResponse.json(judgeLinePositionMove(position.methodLine, stepIndex, attempted));
    }

    if (position.judgeType === "syzygy") {
      return NextResponse.json(await judgeSyzygyPositionMove(position.fen, uci));
    }

    return NextResponse.json({ error: "use_client_stockfish" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "illegal_move") {
      return NextResponse.json({ error: "illegal_move" }, { status: 400 });
    }
    return NextResponse.json({ error: "judge_failed" }, { status: 502 });
  }
}

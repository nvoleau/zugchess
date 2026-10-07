import { bestSyzygyMove, judgeSyzygyMove, safeSyzygyMoves } from "@zugchess/core";
import { Chess } from "chess.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getTablebasePosition } from "@/lib/tablebaseClient";

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const bodySchema = z.object({
  fen: z.string().min(1),
  uci: z.string().regex(UCI_PATTERN),
});

function applyUci(chess: Chess, uci: string) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
}

type GameOverReason = "checkmate" | "stalemate" | "draw";

function gameOverReason(chess: Chess): GameOverReason | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  return "draw";
}

/** Évalue une position sans y jouer de coup : sert à afficher l'objectif avant le premier coup. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fen = new URL(request.url).searchParams.get("fen");
  if (!fen) {
    return NextResponse.json({ error: "missing_fen" }, { status: 400 });
  }

  try {
    const position = await getTablebasePosition(fen);
    return NextResponse.json({
      category: position.category,
      dtz: position.dtz,
      dtm: position.dtm ?? null,
      checkmate: position.checkmate,
      stalemate: position.stalemate,
    });
  } catch {
    return NextResponse.json({ error: "tablebase_unavailable" }, { status: 502 });
  }
}

/**
 * Juge un coup via les tables Syzygy (jusqu'à 7 pièces), pour le jeu libre à partir d'une FEN
 * quelconque (le serveur rejoue le coup, seule source de vérité — cf. CLAUDE.md). Contrairement à
 * `POST /api/judge/:positionId` (SPEC.md), prévu pour la bibliothèque de positions du lot 4, cette
 * route ne dépend d'aucune position enregistrée : elle prend la FEN en entrée.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { fen, uci } = parsed.data;

  const chess = new Chess(fen);
  const played = applyUci(chess, uci);
  if (!played) {
    return NextResponse.json({ error: "illegal_move" }, { status: 400 });
  }
  const fenAfter = chess.fen();

  let before;
  try {
    before = await getTablebasePosition(fen);
  } catch {
    return NextResponse.json({ error: "tablebase_unavailable" }, { status: 502 });
  }

  let judgement;
  try {
    judgement = judgeSyzygyMove(before, uci);
  } catch {
    return NextResponse.json({ error: "move_not_in_tablebase" }, { status: 400 });
  }

  if (judgement.blundered) {
    const hints = safeSyzygyMoves(before).map((m) => m.uci);
    return NextResponse.json({ judgement, hints });
  }

  const endAfterPlayerMove = gameOverReason(chess);
  if (endAfterPlayerMove) {
    return NextResponse.json({ judgement, gameOverReason: endAfterPlayerMove });
  }

  let after;
  try {
    after = await getTablebasePosition(fenAfter);
  } catch {
    return NextResponse.json({ error: "tablebase_unavailable" }, { status: 502 });
  }
  if (after.moves.length === 0) {
    // Mat ou pat déclenché par le coup du joueur, mais non détecté localement (ex. position déjà
    // hors des règles standard de chess.js) : on fait confiance à l'API, qui n'offre alors aucun coup.
    return NextResponse.json({ judgement, gameOverReason: after.checkmate ? "checkmate" : "stalemate" });
  }

  const reply = bestSyzygyMove(after);
  const chessAfterReply = new Chess(fenAfter);
  applyUci(chessAfterReply, reply.uci);

  return NextResponse.json({
    judgement,
    reply: reply.uci,
    fenAfterReply: chessAfterReply.fen(),
    gameOverReason: gameOverReason(chessAfterReply),
  });
}

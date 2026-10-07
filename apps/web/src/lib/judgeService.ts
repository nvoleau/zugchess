import {
  bestKpkReply,
  bestSyzygyMove,
  isPlayerStep,
  judgeKpkMove,
  judgeMethodLineMove,
  judgeSyzygyMove,
  safeSyzygyMoves,
  type MethodLine,
  type SquareMove,
} from "@zugchess/core";
import { Chess } from "chess.js";
import { getTablebasePosition } from "./tablebaseClient";

type GameOverReason = "checkmate" | "stalemate" | "draw";

function gameOverReason(chess: Chess): GameOverReason | null {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  return "draw";
}

function applyUci(chess: Chess, uci: string) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
}

export interface KpkJudgeResult {
  kind: "kpk";
  resultAfter: "win" | "draw" | "loss";
  blundered: boolean;
  tempoLost: boolean;
  fenAfterReply?: string;
  gameOverReason: GameOverReason | null;
}

/**
 * Juge un coup KPK pour une position stockée (`Position.judgeType === "kpk"`), côté serveur — même
 * juge que `KpkTrainer` côté client, mais rejouable côté serveur pour que « le serveur reste la
 * seule source de vérité » (CLAUDE.md) une fois les parcours authentifiés branchés sur l'API.
 */
export function judgeKpkPositionMove(fen: string, uci: string): KpkJudgeResult {
  const chess = new Chess(fen);
  const played = applyUci(chess, uci);
  if (!played) throw new Error("illegal_move");

  const judged = judgeKpkMove(fen, chess.fen());
  if (judged.blundered) {
    return { kind: "kpk", resultAfter: judged.resultAfter, blundered: true, tempoLost: false, gameOverReason: null };
  }

  const endReason = gameOverReason(chess);
  if (endReason || played.promotion) {
    return { kind: "kpk", resultAfter: judged.resultAfter, blundered: false, tempoLost: judged.tempoLost, gameOverReason: endReason };
  }

  const reply = bestKpkReply(chess.fen());
  applyUci(chess, `${reply.from}${reply.to}${reply.promotion ?? ""}`);

  return {
    kind: "kpk",
    resultAfter: judged.resultAfter,
    blundered: false,
    tempoLost: judged.tempoLost,
    fenAfterReply: chess.fen(),
    gameOverReason: gameOverReason(chess),
  };
}

export interface LineJudgeResult {
  kind: "line";
  correct: boolean;
  hint?: string;
  lineComplete: boolean;
  fenAfterAuto?: string;
  nextStepIndex: number;
}

/**
 * Juge un coup de ligne de méthode pour une position stockée (`judgeType === "line"`) : compare le
 * coup tenté au coup attendu à `stepIndex`, puis enchaîne les coups du camp adverse (scriptés dans
 * la ligne, pas de recherche) jusqu'au prochain tour de l'élève.
 */
export function judgeLinePositionMove(line: MethodLine, stepIndex: number, attempted: SquareMove): LineJudgeResult {
  const judged = judgeMethodLineMove(line, stepIndex, attempted);
  if (!judged.correct) {
    return { kind: "line", correct: false, hint: judged.hint?.fr, lineComplete: false, nextStepIndex: stepIndex };
  }

  const chess = new Chess(line.fen);
  for (let i = 0; i <= stepIndex; i++) {
    const step = line.steps[i]!;
    chess.move({ from: step.move.from, to: step.move.to, promotion: step.move.promotion });
  }

  let nextIndex = stepIndex + 1;
  while (nextIndex < line.steps.length && !isPlayerStep(line, nextIndex)) {
    const step = line.steps[nextIndex]!;
    chess.move({ from: step.move.from, to: step.move.to, promotion: step.move.promotion });
    nextIndex++;
  }

  return {
    kind: "line",
    correct: true,
    lineComplete: nextIndex >= line.steps.length,
    fenAfterAuto: chess.fen(),
    nextStepIndex: nextIndex,
  };
}

export interface SyzygyJudgeResult {
  kind: "syzygy";
  blundered: boolean;
  resultAfter: "win" | "draw" | "loss";
  hints?: string[];
  reply?: string;
  fenAfterReply?: string;
  gameOverReason: GameOverReason | null;
}

/** Juge un coup Syzygy pour une position stockée (`judgeType === "syzygy"`) — même logique que `POST /api/judge/syzygy`. */
export async function judgeSyzygyPositionMove(fen: string, uci: string): Promise<SyzygyJudgeResult> {
  const chess = new Chess(fen);
  const played = applyUci(chess, uci);
  if (!played) throw new Error("illegal_move");

  const before = await getTablebasePosition(fen);
  const judged = judgeSyzygyMove(before, uci);

  if (judged.blundered) {
    return {
      kind: "syzygy",
      blundered: true,
      resultAfter: judged.resultAfter,
      hints: safeSyzygyMoves(before).map((m) => m.uci),
      gameOverReason: null,
    };
  }

  const endReason = gameOverReason(chess);
  if (endReason) {
    return { kind: "syzygy", blundered: false, resultAfter: judged.resultAfter, gameOverReason: endReason };
  }

  const after = await getTablebasePosition(chess.fen());
  if (after.moves.length === 0) {
    return { kind: "syzygy", blundered: false, resultAfter: judged.resultAfter, gameOverReason: after.checkmate ? "checkmate" : "stalemate" };
  }
  const reply = bestSyzygyMove(after);
  applyUci(chess, reply.uci);

  return {
    kind: "syzygy",
    blundered: false,
    resultAfter: judged.resultAfter,
    reply: reply.uci,
    fenAfterReply: chess.fen(),
    gameOverReason: gameOverReason(chess),
  };
}

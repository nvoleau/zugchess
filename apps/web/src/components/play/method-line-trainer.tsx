"use client";

import { isPlayerStep, judgeMethodLineMove, type MethodLine } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { legalDests, queenPromotionIfNeeded } from "./chess-move-dests";

/** Joue automatiquement les coups du juge (camp adverse) tant que ce n'est pas le tour de l'élève. */
function playAutoSteps(chess: Chess, line: MethodLine, fromIndex: number): number {
  let index = fromIndex;
  while (index < line.steps.length && !isPlayerStep(line, index)) {
    const step = line.steps[index]!;
    chess.move({ from: step.move.from, to: step.move.to, promotion: step.move.promotion });
    index += 1;
  }
  return index;
}

/**
 * Entraîneur « ligne de méthode » : positions théoriques (Lucena, Philidor, etc.) où le coup
 * attendu à chaque étape de l'élève est fixé à l'avance. Le juge compare le coup tenté au coup de
 * la ligne ; un coup différent est refusé avec un indice, les coups du camp adverse s'enchaînent
 * automatiquement.
 */
export function MethodLineTrainer({ line }: { line: MethodLine }) {
  const t = useTranslations("Play.Method");
  const chessRef = useRef<Chess | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [fen, setFen] = useState(line.fen);
  const [hint, setHint] = useState<string | null>(null);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

  if (!chessRef.current) {
    const chess = new Chess(line.fen);
    const resolvedIndex = playAutoSteps(chess, line, 0);
    chessRef.current = chess;
    if (resolvedIndex !== 0) {
      setStepIndex(resolvedIndex);
      setFen(chess.fen());
    }
  }

  const playerColor = line.playerSide === "white" ? "w" : "b";
  const complete = stepIndex >= line.steps.length;

  const playerStepIndices = line.steps.map((_, i) => i).filter((i) => isPlayerStep(line, i));
  const donePlayerSteps = playerStepIndices.filter((i) => i < stepIndex).length;
  const boxes: TempoBoxState[] = playerStepIndices.map((_, i): TempoBoxState => (i < donePlayerSteps ? "done" : "pending"));

  function handleMove(from: string, to: string) {
    if (complete) return;
    const chess = chessRef.current;
    if (!chess || chess.turn() !== playerColor) return;

    const promotion = queenPromotionIfNeeded(chess, from, to);
    const judgement = judgeMethodLineMove(line, stepIndex, { from, to, promotion });
    if (!judgement.correct) {
      setHint(judgement.hint?.fr ?? null);
      forceSync(); // le coup n'est pas appliqué : on force chessground à revenir à la position réelle.
      return;
    }

    setHint(null);
    const expected = line.steps[stepIndex]!.move;
    chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
    const nextIndex = playAutoSteps(chess, line, stepIndex + 1);
    setStepIndex(nextIndex);
    setFen(chess.fen());
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ChessBoard
        fen={fen}
        orientation={line.playerSide}
        movableColor={complete ? undefined : line.playerSide}
        dests={complete || !chessRef.current ? undefined : legalDests(chessRef.current, playerColor)}
        onMove={handleMove}
      />
      <TempoBar label={t("tempoLabel", { done: donePlayerSteps, total: playerStepIndices.length })} boxes={boxes} />
      {complete && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("complete")}</p>}
      {hint && !complete && <p className="text-sm text-amber-600 dark:text-amber-400">{hint}</p>}
    </div>
  );
}

"use client";

import { isPlayerStep, judgeMethodLineMove, type MethodLine } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { frenchSan, legalDests } from "./chess-move-dests";
import type { TrainerStats } from "./trainer-types";

/**
 * Entraîneur « ligne de méthode » : positions théoriques (Lucena, Philidor, etc.) où le coup
 * attendu à chaque étape de l'élève est fixé à l'avance. Le juge compare le coup tenté au coup de
 * la ligne ; un coup différent est refusé avec un indice, les coups du camp adverse s'enchaînent
 * automatiquement — chacun commenté dans le fil, comme ceux de l'élève.
 */
export function MethodLineTrainer({ line, onComplete }: { line: MethodLine; onComplete?: (stats: TrainerStats) => void }) {
  const t = useTranslations("Play.Method");
  const chessRef = useRef<Chess | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [fen, setFen] = useState(line.fen);
  const [hint, setHint] = useState<string | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

  const blunderRef = useRef(0);
  const movesRef = useRef<string[]>([]);
  const moveDurationsRef = useRef<number[]>([]);
  const moveStartRef = useRef(Date.now());

  function pushFeed(text: string) {
    setFeed((lines) => [...lines, text]);
  }

  /** Joue automatiquement les coups du juge (camp adverse) tant que ce n'est pas le tour de l'élève. */
  function playAutoSteps(chess: Chess, fromIndex: number): number {
    let index = fromIndex;
    while (index < line.steps.length && !isPlayerStep(line, index)) {
      const step = line.steps[index]!;
      const played = chess.move({ from: step.move.from, to: step.move.to, promotion: step.move.promotion });
      if (played) {
        const side = played.color === "w" ? t("sideWhite") : t("sideBlack");
        const san = frenchSan(played.san);
        pushFeed(step.comment.fr ? `${t("feedEngine", { side, san })} ${step.comment.fr}` : t("feedEngine", { side, san }));
      }
      index += 1;
    }
    return index;
  }

  if (!chessRef.current) {
    const chess = new Chess(line.fen);
    const resolvedIndex = playAutoSteps(chess, 0);
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

  function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (complete) return;
    const chess = chessRef.current;
    if (!chess || chess.turn() !== playerColor) return;

    const judgement = judgeMethodLineMove(line, stepIndex, { from, to, promotion });
    if (!judgement.correct) {
      blunderRef.current++;
      setHint(judgement.hint?.fr ?? null);
      forceSync(); // le coup n'est pas appliqué : on force chessground à revenir à la position réelle.
      return;
    }

    setHint(null);
    moveDurationsRef.current.push(Date.now() - moveStartRef.current);
    moveStartRef.current = Date.now();
    const expected = line.steps[stepIndex]!.move;
    movesRef.current.push(`${expected.from}${expected.to}${expected.promotion ?? ""}`);
    const played = chess.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
    if (played) pushFeed(`${frenchSan(played.san)} — ${judgement.comment?.fr ?? ""}`.trim());
    const nextIndex = playAutoSteps(chess, stepIndex + 1);
    setStepIndex(nextIndex);
    setFen(chess.fen());
    if (nextIndex >= line.steps.length) {
      onComplete?.({ errors: blunderRef.current, tempoLost: false, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      {/* Colonne échiquier */}
      <div className="flex flex-col items-center gap-3">
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

      {/* Panneau latéral — commentaires */}
      {feed.length > 0 && (
        <ul className="flex w-full flex-col gap-1.5 text-sm max-h-40 overflow-y-auto md:max-h-[480px] md:w-64">
          {feed.map((lineText, i) => (
            <li key={i} className="rounded-md bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
              {lineText}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { RUSH_HELD_TO_DRAW, bestKpkReply } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import { legalDests } from "@/components/play/chess-move-dests";
import type { PositionDetail } from "@/lib/positionService";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RushMoveResponse {
  live: boolean;
  accepted: boolean;
  fenAfterReply?: string;
  nextStepIndex?: number;
  positionConcluded: boolean;
  correct?: boolean;
  score: number;
  errors: number;
  remainingMs: number;
  runOver: boolean;
  nextPosition?: PositionDetail;
}

export interface RushConclusion {
  correct: boolean;
  nextPosition: PositionDetail | null;
  score: number;
  errors: number;
  remainingMs: number;
  runOver: boolean;
}

/**
 * Une position de Zug Rush (chantier 4) : un seul essai, pas de retry — une maladresse conclut
 * immédiatement la position en échec (contrairement aux entraîneurs normaux, `KpkTrainer` /
 * `SyzygyTrainer`, qui annulent et laissent réessayer indéfiniment). Chaque coup est jugé côté
 * serveur (`POST /api/rush/[runId]/move`, même juges exacts que partout ailleurs). Pour une
 * position « tenir la nulle », le seuil est raccourci à `RUSH_HELD_TO_DRAW` coups (au lieu de 8 en
 * entraînement normal) pour que le rythme reste comparable aux positions « gagner ».
 */
export function RushBoard({
  runId,
  position,
  locale,
  onConcluded,
}: {
  runId: string;
  position: PositionDetail;
  locale: "fr" | "en";
  onConcluded: (result: RushConclusion) => void;
}) {
  const t = useTranslations("App.Rush");
  const chessRef = useRef(new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [moveResult, setMoveResult] = useState<"good" | "bad" | null>(null);
  const [pending, setPending] = useState(false);
  const [concluded, setConcluded] = useState(false);
  const [held, setHeld] = useState(0);

  const stepIndexRef = useRef(0);
  const movesCorrectRef = useRef(0);
  const moveDurationsRef = useRef<number[]>([]);
  const moveStartRef = useRef(Date.now());

  const isDrawGoal = position.expectedResult === "draw";
  const playerColor = position.userSide === "white" ? "w" : "b";

  // KPK defender positions start with the attacker's turn — auto-play the first opponent move
  // so the board immediately shows a position where the player can interact.
  useEffect(() => {
    if (position.judgeType !== "kpk") return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) {
      const reply = bestKpkReply(chess.fen());
      chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion ?? undefined });
      setLastMove([reply.from, reply.to]);
      setFen(chess.fen());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (pending || concluded) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    const fenBefore = chess.fen();
    const played = chess.move({ from, to, promotion });
    if (!played) return;

    setFen(chess.fen());
    setLastMove([from, to]);
    moveDurationsRef.current.push(Date.now() - moveStartRef.current);
    setPending(true);

    try {
      const res = await fetch(`/api/rush/${runId}/move?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: position.id,
          fenBefore,
          uci: `${from}${to}${promotion ?? ""}`,
          stepIndex: position.judgeType === "line" ? stepIndexRef.current : undefined,
          heldSoFar: isDrawGoal ? held : undefined,
          movesSoFar: position.judgeType !== "line" && !isDrawGoal ? movesCorrectRef.current : undefined,
          moveDurationsMs: moveDurationsRef.current,
        }),
      });
      const data: RushMoveResponse = await res.json();

      if (!data.live) {
        onConcluded({ correct: false, nextPosition: null, score: data.score, errors: data.errors, remainingMs: 0, runOver: true });
        return;
      }

      if (!data.accepted) {
        setMoveResult("bad");
        if (data.fenAfterReply) {
          // Show the opponent's punishing move (e.g. pawn capture) before concluding,
          // so the user understands why their move was a blunder.
          await delay(420);
          chess.load(data.fenAfterReply);
          setFen(chess.fen());
          setLastMove(undefined);
        } else {
          chess.undo();
          setFen(chess.fen());
          setLastMove(undefined);
        }
        setConcluded(true);
        await delay(120);
        onConcluded({
          correct: false,
          nextPosition: data.nextPosition ?? null,
          score: data.score,
          errors: data.errors,
          remainingMs: data.remainingMs,
          runOver: data.runOver,
        });
        return;
      }

      setMoveResult("good");
      moveStartRef.current = Date.now();
      if (position.judgeType === "line" && data.nextStepIndex !== undefined) stepIndexRef.current = data.nextStepIndex;
      if (isDrawGoal) setHeld((h) => h + 1);
      else movesCorrectRef.current += 1;
      if (data.fenAfterReply) {
        chess.load(data.fenAfterReply);
        setFen(chess.fen());
      }

      if (data.positionConcluded) {
        setConcluded(true);
        await delay(120);
        onConcluded({
          correct: true,
          nextPosition: data.nextPosition ?? null,
          score: data.score,
          errors: data.errors,
          remainingMs: data.remainingMs,
          runOver: data.runOver,
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <ZugBoard
        fen={fen}
        orientation={position.userSide}
        movableColor={pending || concluded ? undefined : position.userSide}
        dests={pending || concluded ? undefined : legalDests(chessRef.current, playerColor)}
        onMove={handleMove}
        lastMove={lastMove}
        moveResult={moveResult}
        size={420}
      />
      {isDrawGoal && (
        <p className="font-brandMono text-xs text-brand-muted">
          {t("held", { current: Math.min(held, RUSH_HELD_TO_DRAW), total: RUSH_HELD_TO_DRAW })}
        </p>
      )}
    </div>
  );
}

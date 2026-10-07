"use client";

import { bestKpkReply, judgeKpkMove } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { legalDests, queenPromotionIfNeeded } from "./chess-move-dests";

/**
 * Entraîneur roi + pion contre roi : l'élève joue toujours l'attaquant (camp avec le pion), le
 * juge KPK (`bestKpkReply`) répond pour le défenseur. Un coup qui laisse échapper le gain est
 * refusé (annulé) ; un coup qui gagne encore mais plus lentement est accepté et compte un temps
 * perdu sur la barre.
 */
export function KpkTrainer({
  initialFen,
  playerSide,
  onWin,
}: {
  initialFen: string;
  playerSide: "white" | "black";
  onWin?: () => void;
}) {
  const t = useTranslations("Play.Kpk");
  const chessRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(initialFen);
  const [won, setWon] = useState(false);
  const [lostTempos, setLostTempos] = useState(0);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

  const playerColor = playerSide === "white" ? "w" : "b";
  const remaining = won ? 0 : judgeKpkMove(fen, fen).depthBefore;

  function reset() {
    chessRef.current = new Chess(initialFen);
    setFen(initialFen);
    setWon(false);
    setLostTempos(0);
  }

  function handleMove(from: string, to: string) {
    if (won) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    const fenBefore = chess.fen();
    const promotion = queenPromotionIfNeeded(chess, from, to);
    const played = chess.move({ from, to, promotion });
    if (!played) return;

    if (played.promotion) {
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }

    const judged = judgeKpkMove(fenBefore, chess.fen());
    if (judged.blundered) {
      chess.undo();
      forceSync(); // le coup n'est pas appliqué : on force chessground à revenir à la position réelle.
      return;
    }
    if (judged.tempoLost) setLostTempos((n) => n + 1);

    let afterFen = chess.fen();
    const reply = bestKpkReply(afterFen);
    const replied = chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
    if (replied) afterFen = chess.fen();

    setFen(afterFen);
  }

  const boxes: TempoBoxState[] = [
    ...Array.from({ length: remaining }, (): TempoBoxState => "pending"),
    ...Array.from({ length: lostTempos }, (): TempoBoxState => "lost"),
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <ChessBoard
        fen={fen}
        orientation={playerSide}
        movableColor={won ? undefined : playerSide}
        dests={won ? undefined : legalDests(chessRef.current, playerColor)}
        onMove={handleMove}
      />
      <TempoBar label={t("tempoLabel", { count: remaining })} boxes={boxes} />
      {won ? (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t("won")}</p>
      ) : (
        <button type="button" onClick={reset} className="text-xs text-neutral-500 underline dark:text-neutral-400">
          {t("reset")}
        </button>
      )}
    </div>
  );
}

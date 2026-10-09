"use client";

import { type GameResult, kpkResult } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import type { PositionDetail } from "@/lib/positionService";
import { AnnounceStep } from "./announce-step";
import { attackerColorOf } from "./chess-move-dests";
import { KpkTrainer } from "./kpk-trainer";
import { MethodLineTrainer } from "./method-line-trainer";
import { SyzygyTrainer } from "./syzygy-trainer";
import type { TrainerStats } from "./trainer-types";

export interface SessionCardResult {
  announceOk: boolean;
  durationMs: number;
  errors: number;
  tempoLost: boolean;
  moves: string[];
  moveDurationsMs: number[];
}

interface Props {
  position: PositionDetail;
  onComplete: (result: SessionCardResult) => void;
  /** Libellé du bouton de fin — remplace "Position suivante" (ex. "Retour aux leçons"). */
  nextLabel?: string;
}

function sideToMoveOf(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

function truthOf(position: PositionDetail): GameResult {
  if (position.judgeType === "kpk") {
    return kpkResult(position.fen) === "win"
      ? (attackerColorOf(position.fen) as GameResult)
      : "draw";
  }
  return position.expectedResult as GameResult;
}

/**
 * Une position de la séance FSRS : announce → play → done.
 * Supporte kpk, syzygy et line ; stockfish reste placeholder.
 */
export function SessionCard({ position, onComplete, nextLabel }: Props) {
  const t = useTranslations("Play.Card");
  const [phase, setPhase] = useState<"announce" | "play" | "done">("announce");
  const [announceOk, setAnnounceOk] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());
  const statsRef = useRef<TrainerStats>({ errors: 0, tempoLost: false, moves: [], moveDurationsMs: [] });

  useEffect(() => {
    setPhase("announce");
    setAnnounceOk(null);
    startRef.current = Date.now();
    statsRef.current = { errors: 0, tempoLost: false, moves: [], moveDurationsMs: [] };
  }, [position.id]);

  const truth = truthOf(position);

  function handleAnnounce(choice: GameResult) {
    setAnnounceOk(choice === truth);
    setPhase("play");
  }

  function handleFinished(stats: TrainerStats) {
    statsRef.current = stats;
    setPhase("done");
  }

  function handleNext() {
    onComplete({ announceOk: announceOk ?? false, durationMs: Date.now() - startRef.current, ...statsRef.current });
  }

  const btnLabel = nextLabel ?? t("nextCard");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {phase === "announce" && (
        <>
          <ZugBoard fen={position.fen} orientation={position.userSide} />
          <AnnounceStep sideToMove={sideToMoveOf(position.fen)} onAnswer={handleAnnounce} />
        </>
      )}

      {phase !== "announce" && (
        <>
          {announceOk !== null && (
            <p className={`animate-pop-in text-sm ${announceOk ? "text-brand-good" : "text-brand-bad"}`}>
              {announceOk ? t("announceCorrect") : t("announceWrong")}
            </p>
          )}

          {/* Bouton visible directement au-dessus de l'échiquier quand la position est finie */}
          {phase === "done" && (
            <button
              type="button"
              onClick={handleNext}
              className="animate-pop-in rounded-full bg-brand-accent px-6 py-3 font-medium text-brand-ink transition-all hover:bg-brand-accentHover hover:scale-[1.02] active:scale-[0.97]"
            >
              {btnLabel}
            </button>
          )}

          {position.judgeType === "kpk" ? (
            <KpkTrainer
              initialFen={position.fen}
              userColor={position.userSide}
              onWin={handleFinished}
              texts={position.texts}
            />
          ) : position.judgeType === "syzygy" ? (
            <SyzygyTrainer
              initialFen={position.fen}
              userSide={position.userSide}
              onFinished={handleFinished}
              texts={position.texts}
            />
          ) : position.judgeType === "stockfish" ? (
            <div className="mt-2 flex flex-col gap-2 text-sm text-brand-muted">
              <span>Juge Stockfish bientôt disponible.</span>
              <button type="button" onClick={() => handleFinished({ errors: 0, tempoLost: false, moves: [], moveDurationsMs: [] })} className="self-center text-brand-accent underline">
                Passer
              </button>
            </div>
          ) : (
            position.methodLine && (
              <MethodLineTrainer line={position.methodLine} onComplete={handleFinished} />
            )
          )}
        </>
      )}

      {/* Bouton sticky — toujours accessible sans scroller, quel que soit la longueur du feed */}
      {phase === "done" && (
        <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex justify-center">
          <button
            type="button"
            onClick={handleNext}
            className="animate-pop-in pointer-events-auto rounded-full bg-brand-accent px-8 py-3.5 font-semibold text-brand-ink shadow-[0_8px_30px_rgba(255,95,60,0.35)] transition-all hover:bg-brand-accentHover hover:scale-[1.02] active:scale-[0.97]"
          >
            {btnLabel}
          </button>
        </div>
      )}
    </div>
  );
}

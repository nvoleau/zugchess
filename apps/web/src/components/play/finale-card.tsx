"use client";

import { kpkResult, type GameResult } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import type { FinaleCard as FinaleCardData } from "@/content/finales-tempo";
import { attackerColorOf } from "./chess-move-dests";
import { AnnounceStep } from "./announce-step";
import { KpkTrainer } from "./kpk-trainer";
import { MethodLineTrainer } from "./method-line-trainer";

function truthOf(card: FinaleCardData): GameResult {
  if (card.kind === "line") return card.result;
  return kpkResult(card.fen) === "win" ? attackerColorOf(card.fen) : "draw";
}

function fenOf(card: FinaleCardData): string {
  return card.kind === "kpk" ? card.fen : card.line.fen;
}

function sideToMoveOf(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/**
 * Une carte du lot 2 : intro, puis annonce du résultat, puis la position se joue contre le juge
 * (table K+P vs K ou ligne de méthode), avec un bilan à la fin. `locale` sélectionne le texte
 * localisé des champs de contenu (titre, intro, objectif).
 */
export function FinaleCard({ card, locale, onComplete }: { card: FinaleCardData; locale: "fr" | "en"; onComplete?: () => void }) {
  const t = useTranslations("Play.Card");
  const [phase, setPhase] = useState<"announce" | "play" | "done">("announce");
  const [announceCorrect, setAnnounceCorrect] = useState<boolean | null>(null);

  const fen = fenOf(card);
  const truth = truthOf(card);

  function handleAnnounce(choice: GameResult) {
    setAnnounceCorrect(choice === truth);
    setPhase("play");
  }

  function handleFinished() {
    setPhase("done");
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div>
        <h2 className="text-xl font-bold">{card.title[locale]}</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{card.intro[locale]}</p>
      </div>

      {phase === "announce" && (
        <>
          <ChessBoard fen={fen} orientation={card.userColor} />
          <AnnounceStep sideToMove={sideToMoveOf(fen)} onAnswer={handleAnnounce} />
        </>
      )}

      {phase !== "announce" && (
        <>
          {announceCorrect !== null && (
            <p className={announceCorrect ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-amber-600 dark:text-amber-400"}>
              {announceCorrect ? t("announceCorrect") : t("announceWrong")}
            </p>
          )}
          <p className="font-medium">{card.goal[locale]}</p>
          {card.kind === "kpk" ? (
            <KpkTrainer initialFen={card.fen} userColor={card.userColor} onWin={handleFinished} />
          ) : (
            <MethodLineTrainer line={card.line} onComplete={handleFinished} />
          )}
        </>
      )}

      {phase === "done" && onComplete && (
        <button
          type="button"
          onClick={onComplete}
          className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {t("nextCard")}
        </button>
      )}
    </div>
  );
}

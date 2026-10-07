"use client";

import type { GameResult } from "@zugchess/core";
import { useTranslations } from "next-intl";

/**
 * Étape « annonce » : avant de jouer, l'élève annonce le résultat avec le meilleur jeu des deux
 * côtés. C'est l'élément distinctif du mode de jeu (cf. SPEC.md : « Annonce du résultat puis jeu
 * contre le juge »).
 */
export function AnnounceStep({ sideToMove, onAnswer }: { sideToMove: "white" | "black"; onAnswer: (choice: GameResult) => void }) {
  const t = useTranslations("Play.Announce");
  const sideLabel = sideToMove === "white" ? t("sideWhite") : t("sideBlack");

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="font-medium">{t("question", { side: sideLabel })}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onAnswer("white")}
          className="rounded-full border-2 border-neutral-900 px-4 py-2 text-sm font-medium dark:border-white"
        >
          {t("whiteWins")}
        </button>
        <button
          type="button"
          onClick={() => onAnswer("draw")}
          className="rounded-full border-2 border-neutral-900 px-4 py-2 text-sm font-medium dark:border-white"
        >
          {t("draw")}
        </button>
        <button
          type="button"
          onClick={() => onAnswer("black")}
          className="rounded-full border-2 border-neutral-900 px-4 py-2 text-sm font-medium dark:border-white"
        >
          {t("blackWins")}
        </button>
      </div>
    </div>
  );
}

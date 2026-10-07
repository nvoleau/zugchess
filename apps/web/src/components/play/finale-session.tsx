"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FINALE_CARDS, type FinaleCategory } from "@/content/finales-tempo";
import { FinaleCard } from "./finale-card";

const CATEGORIES: FinaleCategory[] = ["pions", "tours"];

/**
 * Les 12 positions du lot 2, dans une liste par catégorie. Pas de planification FSRS ici (lot 5) :
 * l'élève choisit une carte, la joue, puis passe à la suivante — une séance simple, en mémoire.
 */
export function FinaleSession({ locale }: { locale: "fr" | "en" }) {
  const t = useTranslations("Play.Session");
  const [currentId, setCurrentId] = useState<string | null>(null);

  const current = currentId ? FINALE_CARDS.find((c) => c.id === currentId) : null;

  function startCard(id: string) {
    setCurrentId(id);
  }

  function backToLibrary() {
    setCurrentId(null);
  }

  function goToNextCard() {
    if (!currentId) return;
    const index = FINALE_CARDS.findIndex((c) => c.id === currentId);
    const next = FINALE_CARDS[index + 1];
    setCurrentId(next?.id ?? null);
  }

  if (current) {
    return (
      <div className="flex flex-col items-center gap-4">
        <button type="button" onClick={backToLibrary} className="self-start text-sm text-neutral-500 underline dark:text-neutral-400">
          {t("backToLibrary")}
        </button>
        <FinaleCard key={current.id} card={current} locale={locale} onComplete={goToNextCard} />
      </div>
    );
  }

  return (
    <div className="grid w-full gap-8 sm:grid-cols-2">
      {CATEGORIES.map((category) => (
        <div key={category}>
          <h3 className="mb-2 text-lg font-semibold">{t(category === "pions" ? "categoryPawns" : "categoryRooks")}</h3>
          <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {FINALE_CARDS.filter((c) => c.category === category).map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => startCard(card.id)}
                  className="w-full py-2.5 text-left text-sm hover:underline"
                >
                  {card.title[locale]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

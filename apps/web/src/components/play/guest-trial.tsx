"use client";

import { randomWinningKpkFen } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { attackerColorOf } from "./chess-move-dests";
import { KpkTrainer } from "./kpk-trainer";

const TRIAL_SIZE = 3;
const STORAGE_KEY = "zugchess:guestTrialProgress";

function readStoredProgress(): number {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), TRIAL_SIZE) : 0;
}

/**
 * Essai sans compte (cf. SPEC.md « Visiteur ») : 3 positions K+P vs K tirées au hasard, aucun
 * appel réseau ni base de données. La progression (combien de positions gagnées) est gardée en
 * local pour survivre à un rafraîchissement, sans jamais bloquer l'essai si elle est absente.
 */
export function GuestTrial() {
  const t = useTranslations("Try");
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [currentWon, setCurrentWon] = useState(false);
  const [positions] = useState(() => Array.from({ length: TRIAL_SIZE }, () => randomWinningKpkFen()));

  useEffect(() => {
    setIndex(readStoredProgress());
    setMounted(true);
  }, []);

  function handleWin() {
    setCurrentWon(true);
    window.localStorage.setItem(STORAGE_KEY, String(Math.min(index + 1, TRIAL_SIZE)));
  }

  function goToNext() {
    setIndex((i) => i + 1);
    setCurrentWon(false);
  }

  if (!mounted) {
    return <div className="h-[360px] w-[360px]" aria-hidden />;
  }

  if (index >= TRIAL_SIZE) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-base font-medium">{t("done")}</p>
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {t("signUpCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("progress", { current: index + 1, total: TRIAL_SIZE })}</p>
      <KpkTrainer key={index} initialFen={positions[index]!} userColor={attackerColorOf(positions[index]!)} onWin={handleWin} />
      {currentWon && (
        <button
          type="button"
          onClick={goToNext}
          className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          {index + 1 >= TRIAL_SIZE ? t("seeResult") : t("nextPosition")}
        </button>
      )}
    </div>
  );
}

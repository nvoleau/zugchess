"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ONBOARDING_FREE_COUNT, ONBOARDING_POSITIONS } from "@/content/onboarding";
import { KpkTrainer } from "./kpk-trainer";
import { MethodLineTrainer } from "./method-line-trainer";

const STORAGE_KEY = "zugchess:onboardingProgress";
const TOTAL = Math.min(ONBOARDING_FREE_COUNT, ONBOARDING_POSITIONS.length);

function readStoredProgress(): number {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), TOTAL) : 0;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={current} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < current ? "bg-brand-accent" : i === current ? "bg-brand-accent/40 ring-2 ring-brand-accent/30" : "bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Onboarding « waouh » (refonte UX, chantier 2) : 5 finales contre-intuitives jouables sans
 * compte (`@/content/onboarding`), une boucle défi → essai → explication → réessai → célébration
 * par position. La progression (combien de positions gagnées) est gardée en local pour survivre à
 * un rafraîchissement, sans jamais bloquer l'essai si elle est absente — même principe que l'ancien
 * essai aléatoire qu'il remplace.
 */
export function OnboardingTrial() {
  const t = useTranslations("Onboarding");
  const locale = useLocale() as "fr" | "en";
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    setIndex(readStoredProgress());
    setMounted(true);
  }, []);

  function handleWin() {
    setWon(true);
    window.localStorage.setItem(STORAGE_KEY, String(Math.min(index + 1, TOTAL)));
  }

  function goToNext() {
    setIndex((i) => i + 1);
    setWon(false);
  }

  if (!mounted) {
    return <div className="h-[560px] w-full max-w-[480px]" aria-hidden />;
  }

  const finished = index >= TOTAL;

  return (
    <div className="dark flex w-full flex-col gap-5 rounded-[22px] border border-brand-accent/20 bg-gradient-to-b from-[#1A1813] to-[#13110D] p-5 text-brand-cream shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <ProgressDots current={Math.min(index, TOTAL)} total={TOTAL} />
        <span className="font-brandMono text-[11px] uppercase tracking-[0.12em] text-brand-muted">
          {finished ? t("doneBadge") : t("progress", { current: index + 1, total: TOTAL })}
        </span>
      </div>

      {finished ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="text-lg font-medium">{t("done")}</p>
          <p className="text-sm text-brand-muted">{t("doneIntro")}</p>
          <Link
            href="/login"
            className="rounded-full bg-brand-accent px-6 py-3 font-semibold text-brand-ink transition-colors hover:bg-brand-accentHover"
          >
            {t("loginCta")}
          </Link>
        </div>
      ) : (
        <>
          <OnboardingChallenge locale={locale} index={index} />

          {(() => {
            const position = ONBOARDING_POSITIONS[index]!;
            return position.kind === "kpk" ? (
              <KpkTrainer
                key={position.id}
                initialFen={position.fen}
                userColor={position.userColor}
                onWin={handleWin}
                autoHintOnBlunder
              />
            ) : (
              <MethodLineTrainer key={position.id} line={position.line} onComplete={handleWin} autoHintOnBlunder />
            );
          })()}

          {won && (
            <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/[0.06] p-4 text-center">
              <p className="text-sm font-medium text-brand-cream">{ONBOARDING_POSITIONS[index]!.celebration[locale]}</p>
              <button
                type="button"
                onClick={goToNext}
                className="rounded-full bg-brand-accent px-6 py-2.5 font-semibold text-brand-ink transition-colors hover:bg-brand-accentHover"
              >
                {index + 1 >= TOTAL ? t("seeResult") : t("nextPosition")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OnboardingChallenge({ locale, index }: { locale: "fr" | "en"; index: number }) {
  const position = ONBOARDING_POSITIONS[index]!;
  return (
    <div className="flex flex-col gap-1.5 border-b border-white/[0.08] pb-4">
      <span className="font-brandMono text-[11px] uppercase tracking-[0.14em] text-brand-accent">{position.theme[locale]}</span>
      <p className="text-[15px] leading-snug text-brand-cream">{position.challenge[locale]}</p>
    </div>
  );
}

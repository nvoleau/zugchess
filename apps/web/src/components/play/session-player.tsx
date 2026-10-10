"use client";

import { levelForXp } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PositionDetail } from "@/lib/positionService";
import type { SessionQueueEntry } from "@/lib/schedulerService";
import { btnClass } from "@/components/ui/button";
import { SessionCard, type SessionCardResult } from "./session-card";

interface Props {
  items: SessionQueueEntry[];
  locale: "fr" | "en";
  initialTotalXp?: number;
}

interface SessionSummary {
  reviewed: number;
  xpGained: number;
  streak: number;
  levelReached: number | null;
  /** Chantier 4 : somme des variations de cote globale accumulées pendant la séance. */
  ratingDelta: number;
  /** Codes des trophées débloqués pendant la séance (ex. "streak_7") — calculés côté serveur,
   * jamais affichés nulle part avant (chantier 3) malgré une logique de déblocage déjà en place. */
  newAchievements: string[];
}

/** Icône par code de trophée (catalogue statique, `prisma/seed.ts`) — peu de trophées existent
 * aujourd'hui (séries), pas besoin d'un aller-retour serveur pour une poignée d'emoji connus. */
const ACHIEVEMENT_ICON: Record<string, string> = {
  streak_7: "🔥",
  streak_30: "⚡",
  streak_100: "👑",
};

/**
 * Orchestre la séance du jour : charge les positions une par une depuis l'API,
 * soumet les révisions FSRS, affiche une barre de progression et l'écran de fin.
 */
export function SessionPlayer({ items, locale, initialTotalXp = 0 }: Props) {
  const t = useTranslations("Play.Session");
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);
  const [liveXp, setLiveXp] = useState(0);
  const [xpFlash, setXpFlash] = useState<number | null>(null);
  const [ratingFlash, setRatingFlash] = useState<number | null>(null);
  const accXpRef = useRef(0);
  const accRatingRef = useRef(0);
  const lastStreakRef = useRef(0);
  const achievementsRef = useRef<string[]>([]);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratingFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPosition = useCallback(
    async (positionId: string) => {
      setLoading(true);
      setPosition(null);
      try {
        const res = await fetch(`/api/positions/${positionId}?locale=${locale}`);
        if (!res.ok) throw new Error("fetch_error");
        setPosition(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    const item = items[index];
    if (item) {
      fetchPosition(item.positionId);
    } else {
      setLoading(false);
    }
  }, [index, items, fetchPosition]);

  async function handleComplete(result: SessionCardResult) {
    const item = items[index];
    if (!item) return;

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionId: item.positionId,
        announceOk: result.announceOk,
        abandoned: false,
        errors: result.errors,
        tempoLost: result.tempoLost,
        hintRequested: false,
        moveDurationsMs: result.moveDurationsMs,
        durationMs: result.durationMs,
        moves: result.moves,
      }),
    });

    if (res.status === 429) {
      setQuotaReached(true);
      setSummary({
        reviewed: index,
        xpGained: accXpRef.current,
        streak: lastStreakRef.current,
        levelReached: null,
        ratingDelta: accRatingRef.current,
        newAchievements: achievementsRef.current,
      });
      return;
    }

    let gained = 0;
    let ratingGained = 0;
    let newLevel: number | null = null;

    if (res.ok) {
      const data = await res.json();
      gained = data.xpGained ?? 0;
      ratingGained = data.ratingDelta ?? 0;
      accXpRef.current += gained;
      accRatingRef.current += ratingGained;
      setLiveXp(accXpRef.current);
      lastStreakRef.current = data.streak?.current ?? lastStreakRef.current;
      if (Array.isArray(data.newAchievements) && data.newAchievements.length > 0) {
        achievementsRef.current = [...achievementsRef.current, ...data.newAchievements];
      }

      // Détecter une montée de niveau
      const totalXpNow = initialTotalXp + accXpRef.current;
      const levelNow = levelForXp(totalXpNow);
      const levelBefore = levelForXp(initialTotalXp + (accXpRef.current - gained));
      if (levelNow > levelBefore && levelNow > 0) {
        newLevel = levelNow;
      }
    }

    // Flash "+N XP" rapide
    if (gained > 0) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setXpFlash(gained);
      flashTimerRef.current = setTimeout(() => setXpFlash(null), 1400);
    }

    // Flash cote ZugElo — "+8" vert ou "−6" (chantier 4), seulement si la cote a bougé (1ère révision du jour).
    if (ratingGained !== 0) {
      if (ratingFlashTimerRef.current) clearTimeout(ratingFlashTimerRef.current);
      setRatingFlash(ratingGained);
      ratingFlashTimerRef.current = setTimeout(() => setRatingFlash(null), 1400);
    }

    const nextIndex = index + 1;
    if (nextIndex >= items.length) {
      setSummary({
        reviewed: items.length,
        xpGained: accXpRef.current,
        streak: lastStreakRef.current,
        levelReached: newLevel,
        ratingDelta: accRatingRef.current,
        newAchievements: achievementsRef.current,
      });
    } else {
      setIndex(nextIndex);
    }
  }

  if (summary) {
    return (
      <div className="flex flex-col items-center gap-8 py-12 text-center">
        <div>
          <p className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">
            {quotaReached ? t("quotaReached") : t("finished")}
          </p>
          <h2 className="mt-2 font-brandDisplay text-4xl text-brand-cream">{t("finishedTitle")}</h2>
        </div>

        {/* XP — centrepiece */}
        {summary.xpGained > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="font-brandMono text-7xl font-medium leading-none text-brand-accent">
              +{summary.xpGained}
            </span>
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
              {t("summaryXp")}
            </span>
          </div>
        )}

        {/* Cote ZugElo — chantier 4 */}
        {summary.ratingDelta !== 0 && (
          <div className="flex flex-col items-center gap-1">
            <span
              className={`font-brandMono text-2xl font-medium leading-none ${
                summary.ratingDelta > 0 ? "text-brand-good" : "text-brand-bad"
              }`}
            >
              {summary.ratingDelta > 0 ? "+" : ""}
              {summary.ratingDelta}
            </span>
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
              {t("summaryRating")}
            </span>
          </div>
        )}

        {/* Level up */}
        {summary.levelReached && (
          <div className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-5 py-2">
            <span className="font-brandMono text-sm text-brand-accent">
              {t("summaryLevelUp", { level: summary.levelReached })}
            </span>
          </div>
        )}

        {/* Trophées débloqués — chantier 3 : calculés côté serveur depuis le lot 6, jamais montrés avant. */}
        {summary.newAchievements.length > 0 && (
          <div className="flex flex-col items-center gap-2.5">
            {summary.newAchievements.map((code, i) => (
              <div
                key={code}
                className="animate-pop-in flex items-center gap-3 rounded-2xl border border-brand-accent/30 bg-brand-panel px-5 py-3"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="text-2xl">{ACHIEVEMENT_ICON[code] ?? "🏆"}</span>
                <div className="text-left">
                  <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-accent">
                    {t("achievementUnlocked")}
                  </p>
                  <p className="text-sm text-brand-cream">{t(`achievement_${code}`)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Détails */}
        <div className="flex gap-10">
          <div className="flex flex-col items-center gap-1">
            <span className="font-brandMono text-3xl text-brand-cream">{summary.reviewed}</span>
            <span className="text-xs text-brand-muted">{t("summaryReviewed")}</span>
          </div>
          {summary.streak > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-brandMono text-3xl text-brand-accent">{summary.streak}</span>
              <span className="text-xs text-brand-muted">{t("summaryStreak")}</span>
            </div>
          )}
        </div>

        <p className="max-w-sm text-sm text-brand-muted">{t("finishedBody")}</p>
        <Link href="/app" className={btnClass("primary", "lg")}>
          {t("finishedCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de progression + XP live */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 font-brandMono text-xs text-brand-muted">
          {t("progress", { current: index + 1, total: items.length })}
        </span>
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-brand-accent transition-all duration-500"
            style={{ width: `${(index / items.length) * 100}%` }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ratingFlash !== null && (
            <span
              className={`animate-pop-in font-brandMono text-xs font-medium ${
                ratingFlash > 0 ? "text-brand-good" : "text-brand-bad"
              }`}
            >
              {ratingFlash > 0 ? "+" : ""}
              {ratingFlash}
            </span>
          )}
          <div className="w-16 text-right">
            {xpFlash !== null ? (
              <span className="animate-pop-in font-brandMono text-xs font-medium text-brand-accent">
                +{xpFlash} XP
              </span>
            ) : liveXp > 0 ? (
              <span className="font-brandMono text-xs text-brand-muted">
                +{liveXp} XP
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-pulse font-brandMono text-xs text-brand-muted">···</span>
        </div>
      ) : (
        position && <SessionCard position={position} onComplete={handleComplete} />
      )}
    </div>
  );
}

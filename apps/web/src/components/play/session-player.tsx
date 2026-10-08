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
}

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
  const accXpRef = useRef(0);
  const lastStreakRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      });
      return;
    }

    let gained = 0;
    let newLevel: number | null = null;

    if (res.ok) {
      const data = await res.json();
      gained = data.xpGained ?? 0;
      accXpRef.current += gained;
      setLiveXp(accXpRef.current);
      lastStreakRef.current = data.streak?.current ?? lastStreakRef.current;

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

    const nextIndex = index + 1;
    if (nextIndex >= items.length) {
      setSummary({
        reviewed: items.length,
        xpGained: accXpRef.current,
        streak: lastStreakRef.current,
        levelReached: newLevel,
      });
    } else {
      setIndex(nextIndex);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="animate-pulse font-brandMono text-xs text-brand-muted">···</span>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="flex flex-col items-center gap-8 py-12 text-center">
        <div>
          <p className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
            {quotaReached ? t("quotaReached") : t("finished")}
          </p>
          <h2 className="mt-2 font-brandSerif text-4xl text-brand-cream">{t("finishedTitle")}</h2>
        </div>

        {/* XP — centrepiece */}
        {summary.xpGained > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="font-brandMono text-7xl font-medium leading-none text-brand-gold">
              +{summary.xpGained}
            </span>
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
              {t("summaryXp")}
            </span>
          </div>
        )}

        {/* Level up */}
        {summary.levelReached && (
          <div className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-5 py-2">
            <span className="font-brandMono text-sm text-brand-gold">
              {t("summaryLevelUp", { level: summary.levelReached })}
            </span>
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
              <span className="font-brandMono text-3xl text-amber-400">{summary.streak}</span>
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
            className="h-full rounded-full bg-brand-gold transition-all duration-500"
            style={{ width: `${(index / items.length) * 100}%` }}
          />
        </div>
        <div className="shrink-0 w-16 text-right">
          {xpFlash !== null ? (
            <span className="animate-pop-in font-brandMono text-xs font-medium text-brand-gold">
              +{xpFlash} XP
            </span>
          ) : liveXp > 0 ? (
            <span className="font-brandMono text-xs text-brand-muted">
              +{liveXp} XP
            </span>
          ) : null}
        </div>
      </div>

      {position && <SessionCard position={position} onComplete={handleComplete} />}
    </div>
  );
}

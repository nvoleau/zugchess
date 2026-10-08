"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PositionDetail } from "@/lib/positionService";
import type { SessionQueueEntry } from "@/lib/schedulerService";
import { SessionCard, type SessionCardResult } from "./session-card";

interface Props {
  items: SessionQueueEntry[];
  locale: "fr" | "en";
}

interface SessionSummary {
  reviewed: number;
  xpGained: number;
  streak: number;
}

/**
 * Orchestre la séance du jour : charge les positions une par une depuis l'API,
 * soumet les révisions FSRS, affiche une barre de progression et l'écran de fin.
 */
export function SessionPlayer({ items, locale }: Props) {
  const t = useTranslations("Play.Session");
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);
  const accXpRef = useRef(0);
  const lastStreakRef = useRef(0);

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
      setSummary({ reviewed: index, xpGained: accXpRef.current, streak: lastStreakRef.current });
      return;
    }

    if (res.ok) {
      const data = await res.json();
      accXpRef.current += data.xpGained ?? 0;
      lastStreakRef.current = data.streak?.current ?? lastStreakRef.current;
    }

    const nextIndex = index + 1;
    if (nextIndex >= items.length) {
      setSummary({ reviewed: items.length, xpGained: accXpRef.current, streak: lastStreakRef.current });
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
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
          {quotaReached ? t("quotaReached") : t("finished")}
        </span>
        <h2 className="font-brandSerif text-3xl">{t("finishedTitle")}</h2>

        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="font-brandMono text-2xl text-brand-cream">{summary.reviewed}</span>
            <span className="text-xs text-brand-muted">{t("summaryReviewed")}</span>
          </div>
          {summary.xpGained > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-brandMono text-2xl text-brand-gold">+{summary.xpGained}</span>
              <span className="text-xs text-brand-muted">{t("summaryXp")}</span>
            </div>
          )}
          {summary.streak > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-brandMono text-2xl text-brand-cream">{summary.streak}</span>
              <span className="text-xs text-brand-muted">{t("summaryStreak")}</span>
            </div>
          )}
        </div>

        <p className="max-w-sm text-sm text-brand-muted">{t("finishedBody")}</p>
        <Link
          href="/app"
          className="mt-2 rounded-full bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-ink transition-all hover:bg-brand-goldHover"
        >
          {t("finishedCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de progression */}
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
      </div>

      {position && <SessionCard position={position} onComplete={handleComplete} />}
    </div>
  );
}

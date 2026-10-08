"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PositionDetail } from "@/lib/positionService";
import type { SessionQueueEntry } from "@/lib/schedulerService";
import { SessionCard, type SessionCardResult } from "./session-card";

interface Props {
  items: SessionQueueEntry[];
  locale: "fr" | "en";
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
  const [done, setDone] = useState(false);

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
      setDone(true);
    }
  }, [index, items, fetchPosition]);

  async function handleComplete(result: SessionCardResult) {
    const item = items[index];
    if (!item) return;

    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionId: item.positionId,
        announceOk: result.announceOk,
        abandoned: false,
        errors: 0,
        tempoLost: false,
        hintRequested: false,
        moveDurationsMs: [],
        durationMs: result.durationMs,
        moves: [],
      }),
    });

    if (index + 1 >= items.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="animate-pulse font-brandMono text-xs text-brand-muted">···</span>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
          {index} / {items.length}
        </span>
        <h2 className="font-brandSerif text-3xl">{t("finished")}</h2>
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

"use client";

import { RUSH_MAX_ERRORS } from "@zugchess/core";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PositionDetail } from "@/lib/positionService";
import { RushBoard } from "./rush-board";

interface RushLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
}

interface RushMeta {
  record: { best: number; playedToday: boolean };
  entries: RushLeaderboardEntry[];
}

type Phase = "idle" | "starting" | "running" | "finished" | "quota";

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RushRunner({ locale, currentUserId }: { locale: "fr" | "en"; currentUserId: string }) {
  const t = useTranslations("App.Rush");
  const [phase, setPhase] = useState<Phase>("idle");
  const [meta, setMeta] = useState<RushMeta | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [position, setPosition] = useState<PositionDetail | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [displayMs, setDisplayMs] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMeta() {
    const res = await fetch("/api/rush/leaderboard?period=day");
    if (res.ok) setMeta(await res.json());
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (phase !== "running") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setDisplayMs((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase]);

  async function startRun() {
    setPhase("starting");
    const res = await fetch(`/api/rush?locale=${locale}`, { method: "POST" });
    if (res.status === 429) {
      setPhase("quota");
      return;
    }
    if (!res.ok) {
      setPhase("idle");
      return;
    }
    const data = await res.json();
    setRunId(data.runId);
    setPosition(data.position);
    setScore(data.score);
    setErrors(data.errors);
    setRemainingMs(data.durationMs);
    setDisplayMs(data.durationMs);
    setPhase("running");
  }

  function handleConcluded(result: {
    correct: boolean;
    nextPosition: PositionDetail | null;
    score: number;
    errors: number;
    remainingMs: number;
    runOver: boolean;
  }) {
    setScore(result.score);
    setErrors(result.errors);
    setRemainingMs(result.remainingMs);
    setDisplayMs(result.remainingMs);

    if (result.runOver || !result.nextPosition) {
      setFinalScore(result.score);
      setPhase("finished");
      loadMeta();
      return;
    }

    setPosition(result.nextPosition);
  }

  // Fin du temps détectée côté affichage (cosmétique) — le serveur reste seul juge de la fin réelle,
  // le prochain coup soumis serait de toute façon refusé (`live: false`) si le temps est écoulé.
  useEffect(() => {
    if (phase === "running" && displayMs <= 0 && remainingMs > 0) {
      setFinalScore(score);
      setPhase("finished");
      loadMeta();
    }
  }, [displayMs, phase, remainingMs, score]);

  if (phase === "idle" || phase === "starting" || phase === "quota") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <div>
          <p className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">{t("kicker")}</p>
          <h1 className="mt-2 font-brandDisplay text-4xl tracking-tight">{t("title")}</h1>
          <p className="mt-3 max-w-md text-sm text-brand-muted">{t("intro")}</p>
        </div>

        {meta && meta.record.best > 0 && (
          <Card className="flex flex-col items-center gap-1 px-8 py-5">
            <span className="font-brandMono text-3xl text-brand-accent">{meta.record.best}</span>
            <span className="text-xs text-brand-muted">{t("personalRecord")}</span>
          </Card>
        )}

        {phase === "quota" ? (
          <p className="max-w-sm text-sm text-brand-muted">{t("quotaReached")}</p>
        ) : (
          <button type="button" onClick={startRun} disabled={phase === "starting"} className={btnClass("primary", "lg")}>
            {phase === "starting" ? "…" : t("start")}
          </button>
        )}
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="flex flex-col items-center gap-8 py-12 text-center">
        <div>
          <p className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">{t("doneBadge")}</p>
          <h2 className="mt-2 font-brandDisplay text-4xl text-brand-cream">{t("finishedTitle")}</h2>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="font-brandMono text-7xl font-medium leading-none text-brand-accent">{finalScore}</span>
          <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">{t("summaryScore")}</span>
        </div>

        {meta && finalScore >= meta.record.best && finalScore > 0 && (
          <div className="rounded-full border border-brand-accent/30 bg-brand-accent/10 px-5 py-2">
            <span className="font-brandMono text-sm text-brand-accent">{t("newRecord")}</span>
          </div>
        )}

        <button type="button" onClick={startRun} className={btnClass("primary", "lg")}>
          {t("replay")} →
        </button>

        {meta && meta.entries.length > 0 && (
          <Card className="w-full max-w-sm p-0 overflow-hidden text-left">
            <p className="px-5 pt-4 pb-1 font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
              {t("todayLeaderboard")}
            </p>
            <ul>
              {meta.entries.slice(0, 5).map((entry) => (
                <li
                  key={entry.userId}
                  className={`flex items-center gap-3 px-5 py-2 text-sm ${entry.userId === currentUserId ? "bg-brand-accent/[0.07]" : ""}`}
                >
                  <span className="w-5 font-brandMono text-brand-muted">{entry.rank}</span>
                  <span className="flex-1 truncate text-brand-cream">{entry.name}</span>
                  <span className="font-brandMono text-brand-accent">{entry.score}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Link href="/app" className="text-sm text-brand-muted hover:text-brand-cream hover:underline">
          {t("backToApp")}
        </Link>
      </div>
    );
  }

  // running
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-[420px] items-center justify-between">
        <span className="font-brandMono text-2xl tabular-nums text-brand-cream">{formatClock(displayMs)}</span>
        <span className="font-brandMono text-xl text-brand-accent">{score}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: RUSH_MAX_ERRORS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < errors ? "bg-brand-bad" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>

      {position && <RushBoard key={position.id} runId={runId!} position={position} locale={locale} onConcluded={handleConcluded} />}
    </div>
  );
}

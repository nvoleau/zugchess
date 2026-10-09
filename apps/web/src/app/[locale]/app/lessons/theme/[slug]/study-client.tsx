"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { SessionCard, type SessionCardResult } from "@/components/play/session-card";
import type { PositionDetail, PositionMasteryItem } from "@/lib/positionService";

const MASTERY_DOT: Record<string, string> = {
  new: "bg-white/20",
  learning: "bg-brand-accent/35",
  familiar: "bg-brand-accent",
  mastered: "bg-brand-good",
};

export function ThemeStudyClient({
  positions,
  lockedCount = 0,
  initialId,
}: {
  positions: PositionMasteryItem[];
  lockedCount?: number;
  initialId?: string;
}) {
  const locale = useLocale();
  const [selectedId, setSelectedId] = useState<string>(initialId ?? positions[0]?.id ?? "");
  const [detail, setDetail] = useState<PositionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [trainerKey, setTrainerKey] = useState(0);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    fetch(`/api/positions/${selectedId}?locale=${locale}`)
      .then((r) => r.json())
      .then((data: PositionDetail) => {
        if (!cancelled) {
          setDetail(data);
          setTrainerKey((k) => k + 1);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, locale]);

  const selectedIndex = positions.findIndex((p) => p.id === selectedId);

  function handleFinished(result?: SessionCardResult) {
    void result;
    const next = positions[selectedIndex + 1];
    if (next) setSelectedId(next.id);
    // En mode consultation, on n'enregistre pas de révision FSRS
  }

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100svh-7rem)] md:overflow-hidden">
      {/* Sidebar gauche — liste des positions */}
      <div className="shrink-0 w-full overflow-x-auto border-b border-white/[0.06] md:w-56 md:border-b-0 md:border-r md:overflow-x-visible md:overflow-y-auto">
        <div className="flex min-w-max gap-1 p-2 md:min-w-0 md:flex-col md:gap-0 md:p-0">
          {positions.map((pos, i) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => setSelectedId(pos.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors md:rounded-none md:px-4 md:py-2.5 ${
                pos.id === selectedId
                  ? "bg-brand-accent/10 text-brand-cream"
                  : "text-brand-muted hover:bg-white/[0.04] hover:text-brand-cream"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${MASTERY_DOT[pos.mastery] ?? "bg-white/20"}`}
              />
              <span className="whitespace-nowrap font-brandMono text-[11px] md:whitespace-normal md:min-w-0 md:truncate">
                <span className="text-brand-muted">{String(i + 1).padStart(2, "0")}.</span>{" "}
                {pos.title}
              </span>
            </button>
          ))}
          {/* Paywall */}
          {lockedCount > 0 && (
            <div className="mt-2 border-t border-white/[0.06] p-4 md:mt-0">
              <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
                + {lockedCount} positions
              </p>
              <Link
                href="/app/upgrade"
                className="mt-2 block rounded-lg border border-brand-accent/30 bg-brand-accent/[0.06] px-3 py-2 text-center font-brandMono text-xs text-brand-accent transition-colors hover:bg-brand-accent/10"
              >
                Passer Premium →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Zone principale — échiquier + entraîneur */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading && (
          <div className="flex h-40 items-center justify-center text-sm text-brand-muted">
            Chargement…
          </div>
        )}

        {!loading && detail && (
          <SessionCard key={trainerKey} position={detail} onComplete={handleFinished} />
        )}

        {!loading && !detail && positions.length === 0 && (
          <p className="text-sm text-brand-muted">Aucune position dans ce thème.</p>
        )}
      </div>
    </div>
  );
}

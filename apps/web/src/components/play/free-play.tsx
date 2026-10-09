"use client";

import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { btnClass } from "@/components/ui/button";
import { pieceCountOf } from "./chess-move-dests";
import { StockfishTrainer } from "./stockfish-trainer";
import { SyzygyTrainer } from "./syzygy-trainer";

const SYZYGY_MAX_PIECES = 7;

const PRESETS: Array<{ labelKey: string; fen: string }> = [
  { labelKey: "presetRook", fen: "4k3/8/4K3/8/8/8/8/4R3 w - - 0 1" },
  { labelKey: "presetQueenVsRook", fen: "4k3/8/8/8/8/4K3/8/3QR3 w - - 0 1" },
  { labelKey: "presetBishopKnight", fen: "7k/8/5K2/8/8/4BN2/8/8 w - - 0 1" },
  { labelKey: "presetTwoBishops", fen: "7k/8/5K2/8/8/4BB2/8/8 w - - 0 1" },
  { labelKey: "presetRookEnding", fen: "r3k2r/5ppp/8/8/8/8/5PPP/R3K2R w - - 0 1" },
];

function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/**
 * Jeu libre (SPEC.md) : coller une FEN ou choisir une famille de finale, puis jouer contre le juge
 * Syzygy jusqu'au bout. Pas de limite de quota imposée ici — le rattachement à l'offre premium
 * (SPEC.md) reste à faire une fois Stripe en place (lot 7).
 */
export function FreePlay() {
  const t = useTranslations("Play.FreePlay");
  const [fen, setFen] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function start(candidate: string) {
    if (!isValidFen(candidate)) {
      setError(t("invalidFen"));
      return;
    }
    setError(null);
    setFen(candidate);
  }

  if (fen) {
    const useStockfish = pieceCountOf(fen) > SYZYGY_MAX_PIECES;
    return (
      <div className="flex flex-col items-center gap-4">
        <button type="button" onClick={() => setFen(null)} className="text-sm text-brand-muted underline underline-offset-2 hover:text-brand-cream">
          {t("newPosition")}
        </button>
        {useStockfish ? <StockfishTrainer key={fen} initialFen={fen} /> : <SyzygyTrainer key={fen} initialFen={fen} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-[420px] flex-col gap-2">
        <label htmlFor="free-play-fen" className="text-sm font-medium text-brand-cream">
          {t("fenLabel")}
        </label>
        <input
          id="free-play-fen"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="4k3/8/4K3/8/8/8/8/4R3 w - - 0 1"
          className="rounded-md border border-white/15 bg-brand-panel px-3 py-2 font-brandMono text-sm text-brand-cream placeholder:text-brand-muted focus:border-brand-accent focus:outline-none"
        />
        {error && <p className="text-sm text-brand-bad">{error}</p>}
        <button type="button" onClick={() => start(input.trim())} className={btnClass("primary", "md", "self-start")}>
          {t("start")}
        </button>
      </div>

      <div className="flex w-full max-w-[420px] flex-col gap-2.5">
        <p className="text-sm text-brand-muted">{t("orChooseFamily")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.fen}
              type="button"
              onClick={() => start(preset.fen)}
              className="rounded-full border border-white/15 bg-brand-panel px-4 py-1.5 text-sm font-medium text-brand-cream transition-colors hover:border-brand-accent/50 hover:text-brand-accent"
            >
              {t(preset.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Chess } from "chess.js";
import { useLocale } from "next-intl";
import { useCallback, useReducer, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ZugBoard } from "@/components/zug-board";
import { legalDests } from "./chess-move-dests";
import type { WaouhPosition } from "@/content/waouh-positions";
import { WAOUH_POSITIONS } from "@/content/waouh-positions";

const FREE_COUNT = WAOUH_POSITIONS.length; // toutes les positions gratuites pour l'instant

type Step = "challenge" | "playing" | "success" | "done";

interface State {
  posIndex: number;
  step: Step;
  wrongCount: number;
}

type Action =
  | { type: "start" }
  | { type: "wrong" }
  | { type: "success" }
  | { type: "next" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...state, step: "playing" };
    case "wrong":
      return { ...state, wrongCount: state.wrongCount + 1 };
    case "success":
      return { ...state, step: "success" };
    case "next": {
      const nextIndex = state.posIndex + 1;
      if (nextIndex >= FREE_COUNT) return { ...state, posIndex: nextIndex, step: "done" };
      return { posIndex: nextIndex, step: "challenge", wrongCount: 0 };
    }
  }
}

function PositionBoard({
  pos,
  step,
  wrongCount,
  onWrong,
  onSuccess,
}: {
  pos: WaouhPosition;
  step: Step;
  wrongCount: number;
  onWrong: () => void;
  onSuccess: () => void;
}) {
  const locale = useLocale() === "en" ? "en" : "fr";
  const chessRef = useRef(new Chess(pos.fen));
  const [fen, setFen] = useState(pos.fen);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();

  const playerColor = pos.playerColor;
  const chessColor = playerColor === "white" ? "w" : "b";
  const isPlaying = step === "playing";
  const isSuccess = step === "success";

  const shapes = isSuccess
    ? pos.explanationArrows.map((a) => ({ orig: a.from, dest: a.to, brush: a.brush }))
    : (step === "playing" && wrongCount > 0)
      ? pos.hintArrows.map((a) => ({ orig: a.from, dest: a.to, brush: a.brush }))
      : [];

  function handleMove(from: string, to: string) {
    if (!isPlaying) return;
    const chess = chessRef.current;
    if (chess.turn() !== chessColor) return;

    const uci = `${from}${to}`;
    if (pos.keyMoves.includes(uci) || pos.keyMoves.some((km) => km.startsWith(uci))) {
      const played = chess.move({ from, to });
      if (!played) return;
      setLastMove([from, to]);
      setFen(chess.fen());
      onSuccess();
    } else {
      const played = chess.move({ from, to });
      if (!played) return;
      chess.undo();
      forceSync();
      onWrong();
    }
  }

  return (
    <ZugBoard
      fen={fen}
      orientation={playerColor}
      movableColor={isPlaying ? playerColor : undefined}
      dests={isPlaying ? legalDests(chessRef.current, chessColor) : undefined}
      onMove={handleMove}
      lastMove={lastMove}
      shapes={shapes.length > 0 ? shapes : undefined}
    />
  );
}

export function WaouhTrial() {
  const locale = useLocale() === "en" ? "en" : "fr";
  const [state, dispatch] = useReducer(reducer, { posIndex: 0, step: "challenge", wrongCount: 0 });

  const pos = WAOUH_POSITIONS[state.posIndex];

  const handleWrong = useCallback(() => dispatch({ type: "wrong" }), []);
  const handleSuccess = useCallback(() => dispatch({ type: "success" }), []);

  if (state.step === "done" || !pos) {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gold/10 text-3xl">
          ♔
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-brandSerif text-xl text-brand-cream">
            {locale === "fr" ? "Vous avez le sens des finales !" : "You have an endgame feel!"}
          </p>
          <p className="text-sm text-brand-muted max-w-xs">
            {locale === "fr"
              ? "Créez un compte pour accéder aux 1 000+ positions et suivre votre progression."
              : "Create an account to access 1 000+ positions and track your progress."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="rounded-full bg-brand-gold px-6 py-3 font-brandMono text-sm font-medium text-brand-dark hover:opacity-90 transition-opacity"
          >
            {locale === "fr" ? "Créer un compte" : "Create account"}
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/[0.12] px-6 py-3 font-brandMono text-sm text-brand-muted hover:text-brand-cream transition-colors"
          >
            {locale === "fr" ? "En savoir plus" : "Learn more"}
          </Link>
        </div>
      </div>
    );
  }

  const isFirstPos = state.posIndex === 0;
  const totalShown = FREE_COUNT;
  const progressPct = (state.posIndex / totalShown) * 100;

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto">
      {/* Barre de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-brandMono text-[10px] text-brand-muted">
          {state.posIndex + 1} / {totalShown}
        </span>
      </div>

      {/* Étiquette principe */}
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-brand-gold/30 bg-brand-gold/[0.06] px-3 py-0.5 font-brandMono text-[10px] uppercase tracking-[0.12em] text-brand-gold">
          {pos.principleLabel[locale]}
        </span>
      </div>

      {/* Challenge text */}
      <p className="font-brandSerif text-lg leading-snug text-brand-cream">
        {pos.challenge[locale]}
      </p>

      {/* Échiquier */}
      <div className="relative">
        <PositionBoard
          key={state.posIndex}
          pos={pos}
          step={state.step}
          wrongCount={state.wrongCount}
          onWrong={handleWrong}
          onSuccess={handleSuccess}
        />
        {state.step === "challenge" && (
          <button
            type="button"
            onClick={() => dispatch({ type: "start" })}
            className="absolute inset-0 flex items-center justify-center bg-brand-dark/60 backdrop-blur-[2px] rounded-md"
          >
            <span className="rounded-full border border-brand-gold bg-brand-gold/10 px-6 py-3 font-brandMono text-sm font-medium text-brand-gold hover:bg-brand-gold/20 transition-colors">
              {locale === "fr" ? "Jouez !" : "Play!"}
            </span>
          </button>
        )}
      </div>

      {/* Feedback */}
      {state.step === "playing" && state.wrongCount > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm text-amber-300">{pos.hintOnFailure[locale]}</p>
        </div>
      )}

      {state.step === "success" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-brand-good/20 bg-brand-good/[0.06] px-4 py-3">
            <p className="font-medium text-brand-good mb-1">{pos.successTitle[locale]}</p>
            <p className="text-sm text-brand-muted">{pos.successExplanation[locale]}</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "next" })}
            className="self-end rounded-full border border-brand-gold/40 px-5 py-2.5 font-brandMono text-sm text-brand-gold hover:bg-brand-gold/10 transition-colors"
          >
            {state.posIndex + 1 >= totalShown
              ? (locale === "fr" ? "Voir le résultat →" : "See result →")
              : (locale === "fr" ? "Position suivante →" : "Next position →")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { frenchSan, legalDests, sanSequence } from "./chess-move-dests";
import { MoveList, type HalfMove } from "./move-list";
import type { TrainerStats } from "./trainer-types";

const HELD_TO_DRAW = 8;

type Goal = "win" | "draw" | "loss";
type Outcome = "win" | "draw" | "loss";

interface Judgement {
  resultBefore: Outcome;
  resultAfter: Outcome;
  distanceBefore: number | null;
  distanceAfter: number | null;
  blundered: boolean;
  tempoLost: boolean;
}

interface MoveResponse {
  error?: string;
  judgement?: Judgement;
  hints?: string[];
  principalVariation?: string[];
  reply?: string;
  gameOverReason?: "checkmate" | "stalemate" | "draw";
}

const WIN_CATEGORIES = new Set(["win", "cursed-win", "maybe-win"]);
const LOSS_CATEGORIES = new Set(["loss", "blessed-loss", "maybe-loss"]);

function goalFromCategory(category: string): Goal {
  if (WIN_CATEGORIES.has(category)) return "win";
  if (LOSS_CATEGORIES.has(category)) return "loss";
  return "draw";
}

function applyUci(chess: Chess, uci: string) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
}

/**
 * Entraîneur « jeu libre » (SPEC.md) : n'importe quelle position jusqu'à 7 pièces, jugée par le
 * juge Syzygy côté serveur (`POST /api/judge/syzygy`) — le navigateur ne décide jamais seul du
 * résultat, cf. CLAUDE.md. L'élève joue le camp au trait dans la FEN fournie.
 */
export function SyzygyTrainer({
  initialFen,
  userSide,
  onFinished,
  texts,
}: {
  initialFen: string;
  userSide?: "white" | "black";
  onFinished?: (stats: TrainerStats) => void;
  texts?: { title: string; intro: string; goal: string };
}) {
  const t = useTranslations("Play.Syzygy");
  const chessRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(initialFen);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "finished" | "error">("loading");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lostTempos, setLostTempos] = useState(0);
  const [held, setHeld] = useState(0);
  const [remainingHalfMoves, setRemainingHalfMoves] = useState<number | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [moveHistory, setMoveHistory] = useState<HalfMove[]>([]);
  const [hintShape, setHintShape] = useState<{ orig: string; dest: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [,] = useReducer((n: number) => n + 1, 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushMove = useCallback((san: string, color: "w" | "b") => {
    setMoveHistory((h) => [...h, { san, color }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Stats tracking
  const lostTemposRef = useRef(0);
  const blunderRef = useRef(0);
  const movesRef = useRef<string[]>([]);
  const moveDurationsRef = useRef<number[]>([]);
  const moveStartRef = useRef(Date.now());

  const playerColor = initialFen.split(" ")[1] === "b" ? "b" : "w";
  const orientation: "white" | "black" = userSide ?? (playerColor === "w" ? "white" : "black");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/judge/syzygy?fen=${encodeURIComponent(initialFen)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setGoal(goalFromCategory(data.category));
        setRemainingHalfMoves(typeof data.dtz === "number" ? Math.abs(data.dtz) : null);
        setStatus("playing");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFen]);

  function pushFeed(line: string) {
    setFeed((lines) => [...lines, line]);
  }

  function hintSanList(hints: string[]): string {
    const probe = chessRef.current;
    return hints
      .map((uci) => {
        const played = applyUci(probe, uci);
        if (played) probe.undo();
        return played ? frenchSan(played.san) : null;
      })
      .filter((s): s is string => s !== null)
      .join(", ");
  }

  async function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (status !== "playing" || pending) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    const uci = `${from}${to}${promotion ?? ""}`;
    const fenBefore = chess.fen();

    // Appliquer le coup immédiatement (optimiste) pour éviter le snap-back visuel pendant l'appel serveur.
    const played = chess.move({ from, to, promotion });
    if (!played) return;
    setFen(chess.fen());
    setLastMove([from, to]);

    setPending(true);
    try {
      const res = await fetch("/api/judge/syzygy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: fenBefore, uci }),
      });
      const data: MoveResponse = await res.json();

      if (!res.ok || !data.judgement) {
        pushFeed(t("serverError"));
        chess.undo();
        setFen(chess.fen());
        setLastMove(undefined);
        return;
      }
      const judgement = data.judgement;

      if (judgement.blundered) {
        blunderRef.current++;
        // Annuler le coup optimiste avant de sonder les coups valides (qui attendent fenBefore).
        chess.undo();
        setFen(chess.fen());
        setLastMove(undefined);
        setHint(t(goal === "draw" ? "blunderDefender" : "blunderAttacker", { san: frenchSan(played.san), hints: hintSanList(data.hints ?? []) }));
        if (data.principalVariation && data.principalVariation.length > 0) {
          const pvMoves = data.principalVariation.map((pvUci) => ({
            from: pvUci.slice(0, 2),
            to: pvUci.slice(2, 4),
            promotion: (pvUci.slice(4) || undefined) as "q" | "r" | "b" | "n" | undefined,
          }));
          pushFeed(t("principalVariation", { line: sanSequence(fenBefore, pvMoves).join(" ") }));
        }
        return;
      }
      setHint(null);

      // Coup accepté — enregistrer durée et UCI
      moveDurationsRef.current.push(Date.now() - moveStartRef.current);
      movesRef.current.push(uci);
      moveStartRef.current = Date.now();
      pushMove(frenchSan(played.san), played.color);
      setHintShape(null);

      if (goal === "win") {
        if (judgement.tempoLost) lostTemposRef.current++;
        setLostTempos((n) => n + (judgement.tempoLost ? 1 : 0));
        setRemainingHalfMoves(judgement.distanceAfter);
        pushFeed(t(judgement.tempoLost ? "feedTempoLost" : "feedGoodTempo", { san: frenchSan(played.san) }));
      } else if (goal === "draw") {
        setHeld((n) => n + 1);
        pushFeed(t("feedHeld", { san: frenchSan(played.san) }));
      } else {
        pushFeed(t("feedMove", { san: frenchSan(played.san) }));
      }

      if (!data.reply) {
        setStatus("finished");
        setOutcome(judgement.resultAfter);
        onFinished?.({ errors: blunderRef.current, tempoLost: lostTemposRef.current > 0, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
        return;
      }

      const replyUci = data.reply;
      const reply = applyUci(chess, replyUci);
      if (reply) {
        const side = reply.color === "w" ? t("sideWhite") : t("sideBlack");
        pushFeed(t("feedEngine", { side, san: frenchSan(reply.san) }));
        pushMove(frenchSan(reply.san), reply.color);
        setLastMove([replyUci.slice(0, 2), replyUci.slice(2, 4)]);
      }
      setFen(chess.fen());

      if (data.gameOverReason) {
        setStatus("finished");
        setOutcome(judgement.resultAfter);
        onFinished?.({ errors: blunderRef.current, tempoLost: lostTemposRef.current > 0, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
      }
    } catch {
      pushFeed(t("serverError"));
      chess.undo();
      setFen(chess.fen());
      setLastMove(undefined);
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <div className="flex h-[480px] w-[480px] items-center justify-center text-sm text-neutral-500">{t("evaluating")}</div>;
  }
  if (status === "error") {
    return <p className="text-sm text-amber-600 dark:text-amber-400">{t("evalError")}</p>;
  }

  const remainingMoves = remainingHalfMoves === null ? null : Math.ceil(remainingHalfMoves / 2);
  const boxes: TempoBoxState[] =
    goal === "win" && remainingMoves !== null
      ? [
          ...Array.from({ length: remainingMoves }, (): TempoBoxState => "pending"),
          ...Array.from({ length: lostTempos }, (): TempoBoxState => "lost"),
        ]
      : goal === "draw"
        ? Array.from({ length: HELD_TO_DRAW }, (_, i): TempoBoxState => (i < held ? "done" : "pending"))
        : [];

  const label =
    goal === "win"
      ? remainingMoves === null
        ? t("goalWin")
        : t("tempoLabel", { count: remainingMoves })
      : goal === "draw"
        ? t("defenderTempoLabel", { held, total: HELD_TO_DRAW })
        : t("goalLoss");

  async function showHint() {
    if (status !== "playing" || pending || hintLoading) return;
    setHintLoading(true);
    try {
      const res = await fetch(`/api/judge/syzygy?fen=${encodeURIComponent(fen)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.bestMove && typeof data.bestMove === "string" && data.bestMove.length >= 4) {
        setHintShape({ orig: data.bestMove.slice(0, 2), dest: data.bestMove.slice(2, 4) });
      }
    } catch { /* silencieux */ } finally {
      setHintLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      {/* Colonne échiquier */}
      <div className="flex flex-col items-center gap-3">
        <ZugBoard
          fen={fen}
          orientation={orientation}
          movableColor={status === "playing" && !pending ? (playerColor === "w" ? "white" : "black") : undefined}
          dests={status === "playing" && !pending ? legalDests(chessRef.current, playerColor) : undefined}
          onMove={handleMove}
          lastMove={lastMove}
          shapes={hintShape ? [{ orig: hintShape.orig, dest: hintShape.dest, brush: "paleBlue" }] : undefined}
          size={480}
        />
        {boxes.length > 0 && <TempoBar label={label} boxes={boxes} />}
        {goal !== "win" && goal !== "draw" && <p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>}
        {status === "finished" && outcome && (
          <p className="animate-pop-in text-sm font-medium text-brand-good">
            {outcome === "win" ? t("won") : outcome === "draw" ? t("drawn") : t("lost")}
          </p>
        )}
        {hint && <p className="text-sm text-amber-600 dark:text-amber-400">{hint}</p>}
      </div>

      {/* Panneau latéral style étude Lichess */}
      <div className="flex w-full flex-col md:h-[480px] md:w-72">
        {texts && (
          <div className="shrink-0 border-b border-white/[0.08] pb-3 mb-3">
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">{texts.title}</p>
            <p className="mt-1 text-sm text-brand-cream">{texts.goal}</p>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
          <MoveList moves={moveHistory} />
          {feed.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {feed.map((line, i) => (
                <li key={i} className="text-xs text-brand-muted leading-5">{line}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.08] pt-3 mt-3 flex items-center justify-between gap-2">
          {status === "playing" && (
            <button
              type="button"
              onClick={showHint}
              disabled={hintLoading}
              className="min-h-[44px] rounded-full border border-brand-gold/40 px-4 py-2 font-brandMono text-xs text-brand-gold hover:bg-brand-gold/10 disabled:opacity-40"
            >
              {hintLoading ? "…" : t("hintButton")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

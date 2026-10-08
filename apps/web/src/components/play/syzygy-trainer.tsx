"use client";

import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { frenchSan, legalDests, sanSequence } from "./chess-move-dests";

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
}: {
  initialFen: string;
  userSide?: "white" | "black";
  onFinished?: () => void;
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
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

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

    setPending(true);
    try {
      const res = await fetch("/api/judge/syzygy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: chess.fen(), uci }),
      });
      const data: MoveResponse = await res.json();

      if (!res.ok || !data.judgement) {
        pushFeed(t("serverError"));
        forceSync();
        return;
      }
      const judgement = data.judgement;

      if (judgement.blundered) {
        const probe = chessRef.current;
        const attempted = applyUci(probe, uci);
        const attemptedSan = attempted ? frenchSan(attempted.san) : uci;
        if (attempted) probe.undo();
        setHint(t(goal === "draw" ? "blunderDefender" : "blunderAttacker", { san: attemptedSan, hints: hintSanList(data.hints ?? []) }));
        if (data.principalVariation && data.principalVariation.length > 0) {
          const pvMoves = data.principalVariation.map((pvUci) => ({
            from: pvUci.slice(0, 2),
            to: pvUci.slice(2, 4),
            promotion: (pvUci.slice(4) || undefined) as "q" | "r" | "b" | "n" | undefined,
          }));
          pushFeed(t("principalVariation", { line: sanSequence(chessRef.current.fen(), pvMoves).join(" ") }));
        }
        forceSync();
        return;
      }
      setHint(null);

      const played = chess.move({ from, to, promotion });
      if (!played) {
        forceSync();
        return;
      }

      if (goal === "win") {
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
        setFen(chess.fen());
        setStatus("finished");
        setOutcome(judgement.resultAfter);
        onFinished?.();
        return;
      }

      const replyUci = data.reply;
      const reply = applyUci(chess, replyUci);
      if (reply) {
        const side = reply.color === "w" ? t("sideWhite") : t("sideBlack");
        pushFeed(t("feedEngine", { side, san: frenchSan(reply.san) }));
        setLastMove([replyUci.slice(0, 2), replyUci.slice(2, 4)]);
      }
      setFen(chess.fen());

      if (data.gameOverReason) {
        setStatus("finished");
        setOutcome(judgement.resultAfter);
        onFinished?.();
      }
    } catch {
      pushFeed(t("serverError"));
      forceSync();
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <div className="flex h-[360px] w-[360px] items-center justify-center text-sm text-neutral-500">{t("evaluating")}</div>;
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

  return (
    <div className="flex flex-col items-center gap-4">
      <ChessBoard
        fen={fen}
        orientation={orientation}
        movableColor={status === "playing" && !pending ? (playerColor === "w" ? "white" : "black") : undefined}
        dests={status === "playing" && !pending ? legalDests(chessRef.current, playerColor) : undefined}
        onMove={handleMove}
        lastMove={lastMove}
      />
      {boxes.length > 0 && <TempoBar label={label} boxes={boxes} />}
      {goal !== "win" && goal !== "draw" && <p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>}
      {status === "finished" && outcome && (
        <p className="animate-pop-in text-sm font-medium text-brand-good">
          {outcome === "win" ? t("won") : outcome === "draw" ? t("drawn") : t("lost")}
        </p>
      )}
      {hint && <p className="text-sm text-amber-600 dark:text-amber-400">{hint}</p>}
      {feed.length > 0 && (
        <ul className="flex w-full max-w-[360px] flex-col gap-1.5 text-sm">
          {feed.map((line, i) => (
            <li key={i} className="rounded-md bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

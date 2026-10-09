"use client";

import { invertScore, judgeStockfishMove, type EngineScore } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import { evaluatePosition } from "@/lib/cloudEvalClient";
import { frenchSan, legalDests, sanSequence } from "./chess-move-dests";

function formatScore(score: EngineScore, t: ReturnType<typeof useTranslations>): string {
  if (score.type === "mate") return t(score.value > 0 ? "mateFor" : "mateAgainst", { n: Math.abs(score.value) });
  const pawns = (score.value / 100).toFixed(1);
  return score.value > 0 ? `+${pawns}` : pawns;
}

/**
 * Entraîneur « jeu libre » pour les positions de plus de 7 pièces (SPEC.md) : jugées via
 * l'API Lichess cloud-eval côté serveur (`/api/judge/cloud-eval`) — aucun WASM GPL dans le
 * navigateur.
 */
export function StockfishTrainer({ initialFen, toleranceCp = 100 }: { initialFen: string; toleranceCp?: number }) {
  const t = useTranslations("Play.Stockfish");
  const chessRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(initialFen);
  const [status, setStatus] = useState<"loading" | "playing" | "finished" | "error">("loading");
  const [outcome, setOutcome] = useState<"win" | "draw" | "loss" | null>(null);
  const [scoreLabel, setScoreLabel] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [feed, setFeed] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

  const playerColor = initialFen.split(" ")[1] === "b" ? "b" : "w";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { score } = await evaluatePosition(initialFen);
        if (cancelled) return;
        setScoreLabel(formatScore(score, t));
        setStatus("playing");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFen]);

  function pushFeed(line: string) {
    setFeed((lines) => [...lines, line]);
  }

  async function engineReply(): Promise<void> {
    const chess = chessRef.current;
    const { bestMoveUci } = await evaluatePosition(chess.fen());
    const played = chess.move({ from: bestMoveUci.slice(0, 2), to: bestMoveUci.slice(2, 4), promotion: bestMoveUci.slice(4) || undefined });
    if (played) {
      const side = played.color === "w" ? t("sideWhite") : t("sideBlack");
      pushFeed(t("feedEngine", { side, san: frenchSan(played.san) }));
    }
    setFen(chess.fen());

    if (chess.isGameOver()) {
      setStatus("finished");
      setOutcome(chess.isCheckmate() ? "loss" : "draw");
      return;
    }
    const { score } = await evaluatePosition(chess.fen());
    setScoreLabel(formatScore(invertScore(score), t));
  }

  async function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (status !== "playing" || pending) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    setPending(true);
    try {
      const fenBefore = chess.fen();
      const { score: bestScoreBefore, bestMoveUci: bestMoveBefore, pv } = await evaluatePosition(fenBefore);

      const played = chess.move({ from, to, promotion });
      if (!played) {
        forceSync();
        return;
      }

      if (chess.isGameOver()) {
        pushFeed(t("feedMove", { san: frenchSan(played.san) }));
        setFen(chess.fen());
        setStatus("finished");
        setOutcome(chess.isCheckmate() ? "win" : "draw");
        return;
      }

      const { score: scoreAfter } = await evaluatePosition(chess.fen());
      const judged = judgeStockfishMove(bestScoreBefore, scoreAfter, toleranceCp);

      if (judged.blundered) {
        chess.undo();
        const pvMoves = pv.map((uci) => ({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: (uci.slice(4) || undefined) as "q" | "r" | "b" | "n" | undefined,
        }));
        const pvSan = sanSequence(fenBefore, pvMoves);
        setHint(t("blunder", { san: frenchSan(played.san), best: pvSan[0] ?? bestMoveBefore }));
        if (pvSan.length > 0) pushFeed(t("principalVariation", { line: pvSan.join(" ") }));
        forceSync();
        return;
      }
      setHint(null);

      pushFeed(t(judged.lostCentipawns > 0 ? "feedImprecise" : "feedGoodMove", { san: frenchSan(played.san) }));
      setFen(chess.fen());
      await engineReply();
    } catch {
      pushFeed(t("engineError"));
      forceSync();
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <div className="flex h-64 w-full max-w-[480px] items-center justify-center text-sm text-neutral-500">{t("evaluating")}</div>;
  }
  if (status === "error") {
    return <p className="text-sm text-amber-600 dark:text-amber-400">{t("evalError")}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ZugBoard
        fen={fen}
        orientation={playerColor === "w" ? "white" : "black"}
        movableColor={status === "playing" && !pending ? (playerColor === "w" ? "white" : "black") : undefined}
        dests={status === "playing" && !pending ? legalDests(chessRef.current, playerColor) : undefined}
        onMove={handleMove}
      />
      {scoreLabel && status === "playing" && <p className="text-sm font-medium">{t("evalLabel", { score: scoreLabel })}</p>}
      {pending && <p className="text-xs text-neutral-500">{t("thinking")}</p>}
      {status === "finished" && outcome && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {outcome === "win" ? t("won") : outcome === "draw" ? t("drawn") : t("lost")}
        </p>
      )}
      {hint && <p className="text-sm text-amber-600 dark:text-amber-400">{hint}</p>}
      {feed.length > 0 && (
        <ul className="flex w-full max-w-[480px] flex-col gap-1.5 text-sm">
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

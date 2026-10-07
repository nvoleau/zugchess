"use client";

import { invertScore, judgeStockfishMove, type EngineScore } from "@zugchess/core";
import { Chess } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { StockfishEngine } from "@/lib/stockfishEngine";
import { frenchSan, legalDests, sanSequence } from "./chess-move-dests";

const SEARCH_DEPTH = 12;

function formatScore(score: EngineScore, t: ReturnType<typeof useTranslations>): string {
  if (score.type === "mate") return t(score.value > 0 ? "mateFor" : "mateAgainst", { n: Math.abs(score.value) });
  const pawns = (score.value / 100).toFixed(1);
  return score.value > 0 ? `+${pawns}` : pawns;
}

/**
 * Entraîneur « jeu libre » pour les positions de plus de 7 pièces (SPEC.md) : jugées par Stockfish
 * WASM dans le navigateur (`StockfishEngine`), selon un seuil de tolérance en centipions — aucun
 * appel réseau, le moteur tourne localement dans un worker.
 */
export function StockfishTrainer({ initialFen, toleranceCp = 100 }: { initialFen: string; toleranceCp?: number }) {
  const t = useTranslations("Play.Stockfish");
  const engineRef = useRef<StockfishEngine | null>(null);
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
    const engine = new StockfishEngine();
    engineRef.current = engine;
    let cancelled = false;
    (async () => {
      try {
        const { score } = await engine.evaluate(initialFen, { depth: SEARCH_DEPTH });
        if (cancelled) return;
        setScoreLabel(formatScore(score, t));
        setStatus("playing");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFen]);

  function pushFeed(line: string) {
    setFeed((lines) => [...lines, line]);
  }

  async function engineReply(): Promise<void> {
    const engine = engineRef.current;
    const chess = chessRef.current;
    if (!engine) return;
    const { bestMoveUci } = await engine.evaluate(chess.fen(), { depth: SEARCH_DEPTH });
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
    const { score } = await engine.evaluate(chess.fen(), { depth: SEARCH_DEPTH });
    setScoreLabel(formatScore(invertScore(score), t)); // reconverti du point de vue de l'élève
  }

  async function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (status !== "playing" || pending) return;
    const chess = chessRef.current;
    const engine = engineRef.current;
    if (!engine || chess.turn() !== playerColor) return;

    setPending(true);
    try {
      const fenBefore = chess.fen();
      const { score: bestScoreBefore, bestMoveUci: bestMoveBefore, pv } = await engine.evaluate(fenBefore, { depth: SEARCH_DEPTH });

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

      const { score: scoreAfter } = await engine.evaluate(chess.fen(), { depth: SEARCH_DEPTH });
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
    return <div className="flex h-[360px] w-[360px] items-center justify-center text-sm text-neutral-500">{t("evaluating")}</div>;
  }
  if (status === "error") {
    return <p className="text-sm text-amber-600 dark:text-amber-400">{t("evalError")}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <ChessBoard
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

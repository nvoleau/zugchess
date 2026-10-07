"use client";

import { bestKpkReply, judgeKpkMove } from "@zugchess/core";
import { Chess, type Move } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { attackerColorOf, frenchSan, legalDests, queenPromotionIfNeeded, type Color } from "./chess-move-dests";

const HELD_TO_DRAW = 8;

function colorToChessJs(color: Color): "w" | "b" {
  return color === "white" ? "w" : "b";
}

/** Coups qui ne gâchent pas le résultat actuel, pour signaler ce qui marchait après une erreur. */
function findSafeMoves(chess: Chess, playerColor: "w" | "b", role: "attacker" | "defender"): Move[] {
  const safe: Move[] = [];
  for (const candidate of chess.moves({ verbose: true })) {
    if (candidate.color !== playerColor) continue;
    const fenBefore = chess.fen();
    const played = chess.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion ?? "q" });
    if (!played) continue;
    const judged = judgeKpkMove(fenBefore, chess.fen());
    chess.undo();
    const ok = role === "attacker" ? judged.resultAfter === "win" : judged.resultAfter === "draw";
    if (ok) safe.push(candidate);
  }
  return safe;
}

/**
 * Entraîneur roi + pion contre roi : l'élève joue `userColor`, qui peut être le camp attaquant
 * (camp avec le pion — objectif : promouvoir) ou le camp défenseur (objectif : tenir la nulle, en
 * capturant le pion ou en résistant 8 coups). Le juge KPK (`bestKpkReply`) répond pour l'autre
 * camp. Un coup qui gâche le résultat est refusé (annulé) avec un indice ; côté attaquant, un coup
 * qui gagne encore mais plus lentement est accepté et compte un temps perdu sur la barre.
 */
export function KpkTrainer({
  initialFen,
  userColor,
  onWin,
}: {
  initialFen: string;
  userColor: Color;
  onWin?: () => void;
}) {
  const t = useTranslations("Play.Kpk");
  const chessRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(initialFen);
  const [won, setWon] = useState(false);
  const [lostTempos, setLostTempos] = useState(0);
  const [held, setHeld] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [, forceSync] = useReducer((n: number) => n + 1, 0);

  const role = userColor === attackerColorOf(initialFen) ? "attacker" : "defender";
  const playerColor = colorToChessJs(userColor);
  const remainingHalfMoves = won ? 0 : judgeKpkMove(fen, fen).depthBefore;
  const remainingMoves = Math.ceil(remainingHalfMoves / 2);

  const [resetCount, setResetCount] = useState(0);
  const openedRef = useRef(false);

  function reset() {
    chessRef.current = new Chess(initialFen);
    setFen(initialFen);
    setWon(false);
    setLostTempos(0);
    setHeld(0);
    setFeed([]);
    openedRef.current = false;
    setResetCount((n) => n + 1);
  }

  function pushFeed(line: string) {
    setFeed((lines) => [...lines, line]);
  }

  function engineReply(afterFen: string): string {
    const chess = chessRef.current;
    const reply = bestKpkReply(afterFen);
    const replied = chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
    if (!replied) return afterFen;
    const side = replied.color === "w" ? t("sideWhite") : t("sideBlack");
    pushFeed(t("feedEngine", { side, san: frenchSan(replied.san) }));
    return chess.fen();
  }

  // La FEN de départ peut placer l'autre camp au trait (ex. entraînement en défense) : le juge
  // joue alors son premier coup avant que l'élève puisse interagir.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (chessRef.current.turn() !== playerColor) {
      setFen(engineReply(chessRef.current.fen()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCount]);

  function handleMove(from: string, to: string) {
    if (won) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    const fenBefore = chess.fen();
    const promotion = queenPromotionIfNeeded(chess, from, to);
    const played = chess.move({ from, to, promotion });
    if (!played) return;

    const judged = judgeKpkMove(fenBefore, chess.fen());
    const outcomeOk = role === "attacker" ? judged.resultAfter === "win" : judged.resultAfter === "draw";

    if (!outcomeOk) {
      chess.undo();
      const safe = findSafeMoves(chess, playerColor, role);
      const hints = safe.map((m) => frenchSan(m.san)).join(", ");
      pushFeed(t(role === "attacker" ? "blunderAttacker" : "blunderDefender", { san: frenchSan(played.san), hints }));
      forceSync(); // le coup n'est pas appliqué : on force chessground à revenir à la position réelle.
      return;
    }

    if (role === "attacker") {
      if (played.promotion) {
        pushFeed(t("feedPromotion", { san: frenchSan(played.san) }));
        setFen(chess.fen());
        setWon(true);
        onWin?.();
        return;
      }
      if (judged.tempoLost) {
        setLostTempos((n) => n + 1);
        pushFeed(t("feedTempoLost", { san: frenchSan(played.san) }));
      } else {
        pushFeed(t("feedGoodTempo", { san: frenchSan(played.san) }));
      }
      setFen(engineReply(chess.fen()));
      return;
    }

    // Défenseur : capture du pion = nulle immédiate ; sinon ça tient, et ça continue.
    if (played.captured === "p") {
      pushFeed(t("feedCapture", { san: frenchSan(played.san) }));
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }
    const nextHeld = held + 1;
    setHeld(nextHeld);
    pushFeed(t("feedHeld", { san: frenchSan(played.san) }));
    if (nextHeld >= HELD_TO_DRAW) {
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }
    setFen(engineReply(chess.fen()));
  }

  const boxes: TempoBoxState[] =
    role === "attacker"
      ? [
          ...Array.from({ length: remainingMoves }, (): TempoBoxState => "pending"),
          ...Array.from({ length: lostTempos }, (): TempoBoxState => "lost"),
        ]
      : Array.from({ length: HELD_TO_DRAW }, (_, i): TempoBoxState => (i < held ? "done" : "pending"));

  const label =
    role === "attacker" ? t("tempoLabel", { count: remainingMoves }) : t("defenderTempoLabel", { held, total: HELD_TO_DRAW });

  return (
    <div className="flex flex-col items-center gap-4">
      <ChessBoard
        fen={fen}
        orientation={userColor}
        movableColor={won ? undefined : userColor}
        dests={won ? undefined : legalDests(chessRef.current, playerColor)}
        onMove={handleMove}
      />
      <TempoBar label={label} boxes={boxes} />
      {won ? (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{role === "attacker" ? t("won") : t("heldDraw")}</p>
      ) : (
        <button type="button" onClick={reset} className="text-xs text-neutral-500 underline dark:text-neutral-400">
          {t("reset")}
        </button>
      )}
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

"use client";

import { bestKpkReply, judgeKpkMove, kpkPrincipalVariation } from "@zugchess/core";
import { Chess, type Move } from "chess.js";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState } from "react";
import { ChessBoard } from "@/components/chess-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { attackerColorOf, frenchSan, legalDests, sanSequence, type Color } from "./chess-move-dests";

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

  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [resetCount, setResetCount] = useState(0);
  const openedRef = useRef(false);

  function reset() {
    chessRef.current = new Chess(initialFen);
    setFen(initialFen);
    setWon(false);
    setLostTempos(0);
    setHeld(0);
    setFeed([]);
    setLastMove(undefined);
    openedRef.current = false;
    setResetCount((n) => n + 1);
  }

  function pushFeed(line: string) {
    setFeed((lines) => [...lines, line]);
  }

  // Returns [newFen, [from, to]] on success, null if the engine has no valid reply.
  function engineReply(afterFen: string): [string, [string, string]] | null {
    const chess = chessRef.current;
    const reply = bestKpkReply(afterFen);
    let replied = chess.move({ from: reply.from, to: reply.to, promotion: reply.promotion });
    if (!replied) {
      // Fallback: pick any legal move for the engine
      const engineColor = chess.turn();
      for (const m of chess.moves({ verbose: true })) {
        if (m.color !== engineColor) continue;
        replied = chess.move({ from: m.from, to: m.to, promotion: m.promotion as "q" | "r" | "b" | "n" | undefined });
        if (replied) break;
      }
    }
    if (!replied) return null;
    const side = replied.color === "w" ? t("sideWhite") : t("sideBlack");
    pushFeed(t("feedEngine", { side, san: frenchSan(replied.san) }));
    return [chess.fen(), [replied.from, replied.to]];
  }

  // La FEN de départ peut placer l'autre camp au trait (ex. entraînement en défense) : le juge
  // joue alors son premier coup avant que l'élève puisse interagir.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (chessRef.current.turn() !== playerColor) {
      const result = engineReply(chessRef.current.fen());
      if (result) {
        const [newFen, move] = result;
        setLastMove(move);
        setFen(newFen);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetCount]);

  function handleMove(from: string, to: string, promotion?: "q" | "r" | "b" | "n") {
    if (won) return;
    const chess = chessRef.current;
    if (chess.turn() !== playerColor) return;

    const fenBefore = chess.fen();
    const played = chess.move({ from, to, promotion });
    if (!played) return;

    // Check terminal cases before judgeKpkMove: post-promotion/capture FENs are not KPK positions.
    if (role === "attacker" && played.promotion) {
      pushFeed(t("feedPromotion", { san: frenchSan(played.san) }));
      setLastMove([from, to]);
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }
    if (role === "defender" && played.captured === "p") {
      pushFeed(t("feedCapture", { san: frenchSan(played.san) }));
      setLastMove([from, to]);
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }

    const judged = judgeKpkMove(fenBefore, chess.fen());
    const outcomeOk = role === "attacker" ? judged.resultAfter === "win" : judged.resultAfter === "draw";

    if (!outcomeOk) {
      chess.undo();
      const safe = findSafeMoves(chess, playerColor, role);
      const hints = safe.map((m) => frenchSan(m.san)).join(", ");
      pushFeed(t(role === "attacker" ? "blunderAttacker" : "blunderDefender", { san: frenchSan(played.san), hints }));
      const pv = kpkPrincipalVariation(fenBefore, 5);
      if (pv.length > 0) pushFeed(t("principalVariation", { line: sanSequence(fenBefore, pv).join(" ") }));
      forceSync(); // le coup n'est pas appliqué : on force chessground à revenir à la position réelle.
      return;
    }

    if (role === "attacker") {
      if (judged.tempoLost) {
        setLostTempos((n) => n + 1);
        pushFeed(t("feedTempoLost", { san: frenchSan(played.san) }));
      } else {
        pushFeed(t("feedGoodTempo", { san: frenchSan(played.san) }));
      }
      const result = engineReply(chess.fen());
      if (!result) {
        // Engine has no reply — revert the player's move to keep the game playable
        chess.undo();
        forceSync();
        return;
      }
      const [newFen, engineMove] = result;
      setLastMove(engineMove);
      setFen(newFen);
      return;
    }

    // Défenseur : coup normal — ça tient, et ça continue.
    const nextHeld = held + 1;
    setHeld(nextHeld);
    pushFeed(t("feedHeld", { san: frenchSan(played.san) }));
    if (nextHeld >= HELD_TO_DRAW) {
      setLastMove([from, to]);
      setFen(chess.fen());
      setWon(true);
      onWin?.();
      return;
    }
    const defResult = engineReply(chess.fen());
    if (!defResult) {
      chess.undo();
      forceSync();
      return;
    }
    const [defFen, defMove] = defResult;
    setLastMove(defMove);
    setFen(defFen);
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
        lastMove={lastMove}
      />
      <TempoBar label={label} boxes={boxes} />
      {won ? (
        <p className="animate-pop-in text-sm font-medium text-brand-good">{role === "attacker" ? t("won") : t("heldDraw")}</p>
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

"use client";

import { bestKpkReply, judgeKpkMove, kpkPrincipalVariation } from "@zugchess/core";
import { Chess, type Move } from "chess.js";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ZugBoard } from "@/components/zug-board";
import { TempoBar, type TempoBoxState } from "@/components/tempo-bar";
import { attackerColorOf, frenchSan, legalDests, sanSequence, type Color } from "./chess-move-dests";
import { MoveList, type HalfMove } from "./move-list";
import type { TrainerStats } from "./trainer-types";

const HELD_TO_DRAW = 8;
const MAX_TOTAL_HALF_MOVES = 24; // filet de sécurité si aucune autre condition n'a déclenché la fin

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
  texts,
  autoHintOnBlunder,
}: {
  initialFen: string;
  userColor: Color;
  onWin?: (stats: TrainerStats) => void;
  texts?: { title: string; intro: string; goal: string };
  /** Affiche automatiquement la flèche du bon coup après une maladresse, sans bouton (onboarding). */
  autoHintOnBlunder?: boolean;
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
  const [moveHistory, setMoveHistory] = useState<HalfMove[]>([]);
  const [hintShape, setHintShape] = useState<{ orig: string; dest: string } | null>(null);
  const openedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushMove = useCallback((san: string, color: "w" | "b") => {
    setMoveHistory((h) => [...h, { san, color }]);
  }, []);

  // Stats tracking (refs pour éviter les problèmes de closure dans les callbacks)
  const lostTemposRef = useRef(0);
  const blunderRef = useRef(0);
  const movesRef = useRef<string[]>([]);
  const moveDurationsRef = useRef<number[]>([]);
  const moveStartRef = useRef(Date.now());

  function reset() {
    chessRef.current = new Chess(initialFen);
    setFen(initialFen);
    setWon(false);
    setLostTempos(0);
    setHeld(0);
    setFeed([]);
    setLastMove(undefined);
    setMoveHistory([]);
    setHintShape(null);
    openedRef.current = false;
    lostTemposRef.current = 0;
    blunderRef.current = 0;
    movesRef.current = [];
    moveDurationsRef.current = [];
    moveStartRef.current = Date.now();
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
      const engineColor = chess.turn();
      for (const m of chess.moves({ verbose: true })) {
        if (m.color !== engineColor) continue;
        replied = chess.move({ from: m.from, to: m.to, promotion: m.promotion as "q" | "r" | "b" | "n" | undefined });
        if (replied) break;
      }
    }
    if (!replied) return null;
    const side = replied.color === "w" ? t("sideWhite") : t("sideBlack");
    // When user is attacker, engine plays as defender → show "most resistant defense" context
    const feedKey = role === "attacker" ? "feedEngineDefender" : "feedEngine";
    pushFeed(t(feedKey, { side, san: frenchSan(replied.san) }));
    pushMove(frenchSan(replied.san), replied.color);
    return [chess.fen(), [replied.from, replied.to]];
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

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
      moveDurationsRef.current.push(Date.now() - moveStartRef.current);
      movesRef.current.push(`${from}${to}${promotion ?? ""}`);
      pushMove(frenchSan(played.san), played.color);
      setHintShape(null);
      pushFeed(t("feedPromotion", { san: frenchSan(played.san) }));
      setLastMove([from, to]);
      setFen(chess.fen());
      setWon(true);
      onWin?.({ errors: blunderRef.current, tempoLost: lostTemposRef.current > 0, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
      return;
    }
    if (role === "defender" && played.captured === "p") {
      moveDurationsRef.current.push(Date.now() - moveStartRef.current);
      movesRef.current.push(`${from}${to}${promotion ?? ""}`);
      pushMove(frenchSan(played.san), played.color);
      setHintShape(null);
      pushFeed(t("feedCapture", { san: frenchSan(played.san) }));
      setLastMove([from, to]);
      setFen(chess.fen());
      setWon(true);
      onWin?.({ errors: blunderRef.current, tempoLost: lostTemposRef.current > 0, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
      return;
    }

    const judged = judgeKpkMove(fenBefore, chess.fen());
    const outcomeOk = role === "attacker" ? judged.resultAfter === "win" : judged.resultAfter === "draw";

    if (!outcomeOk) {
      chess.undo();
      blunderRef.current++;
      const safe = findSafeMoves(chess, playerColor, role);
      const hints = safe.map((m) => frenchSan(m.san)).join(", ");
      pushFeed(t(role === "attacker" ? "blunderAttacker" : "blunderDefender", { san: frenchSan(played.san), hints }));
      const pv = kpkPrincipalVariation(fenBefore, 5);
      if (pv.length > 0) pushFeed(t("principalVariation", { line: sanSequence(fenBefore, pv).join(" ") }));
      if (autoHintOnBlunder && safe[0]) {
        setHintShape({ orig: safe[0].from, dest: safe[0].to });
      }
      forceSync(); // le coup n'est pas appliqué : on force ZugBoard à revenir à la position réelle.
      return;
    }

    // Coup accepté — enregistrer durée et UCI
    moveDurationsRef.current.push(Date.now() - moveStartRef.current);
    movesRef.current.push(`${from}${to}${promotion ?? ""}`);
    moveStartRef.current = Date.now();
    pushMove(frenchSan(played.san), played.color);
    setHintShape(null);

    if (role === "attacker") {
      if (judged.tempoLost) {
        lostTemposRef.current++;
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
      onWin?.({ errors: blunderRef.current, tempoLost: false, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
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

    // Répétition triple, pat ou plafond de demi-coups → nulle acquise.
    if (chess.isThreefoldRepetition() || chess.isDraw() || chess.history().length >= MAX_TOTAL_HALF_MOVES) {
      pushFeed(t("feedDrawLimit"));
      setWon(true);
      onWin?.({ errors: blunderRef.current, tempoLost: false, moves: [...movesRef.current], moveDurationsMs: [...moveDurationsRef.current] });
      return;
    }
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

  function showHint() {
    if (won || chessRef.current.turn() !== playerColor) return;
    try {
      const move = bestKpkReply(fen);
      setHintShape({ orig: move.from, dest: move.to });
    } catch { /* aucun coup disponible */ }
  }

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
      {/* Colonne échiquier */}
      <div className="flex flex-col items-center gap-3">
        <ZugBoard
          fen={fen}
          orientation={userColor}
          movableColor={won ? undefined : userColor}
          dests={won ? undefined : legalDests(chessRef.current, playerColor)}
          onMove={handleMove}
          lastMove={lastMove}
          shapes={hintShape ? [{ orig: hintShape.orig, dest: hintShape.dest, brush: "paleBlue" }] : undefined}
          size={480}
        />
        <TempoBar label={label} boxes={boxes} />
        {won && (
          <p className="animate-pop-in text-sm font-medium text-brand-good">{role === "attacker" ? t("won") : t("heldDraw")}</p>
        )}
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
          {!won && (
            <button
              type="button"
              onClick={showHint}
              className="min-h-[44px] rounded-full border border-brand-accent/40 px-4 py-2 font-brandMono text-xs text-brand-accent hover:bg-brand-accent/10"
            >
              {t("hintButton")}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="ml-auto min-h-[44px] px-2 text-xs text-brand-muted hover:text-brand-cream underline underline-offset-2"
          >
            {t("reset")}
          </button>
        </div>
      </div>
    </div>
  );
}

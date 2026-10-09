"use client";

import { Chessboard } from "react-chessboard";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useResizeBoardSize } from "@/hooks/use-resize-board-size";

export type PromotionPiece = "q" | "r" | "b" | "n";

export interface ZugBoardProps {
  fen: string;
  orientation?: "white" | "black";
  /** Camp autorisé à jouer ; undefined = lecture seule. */
  movableColor?: "white" | "black";
  /** Cases de départ → destinations légales (filtre côté trainer). */
  dests?: Map<string, string[]>;
  lastMove?: [string, string];
  check?: boolean;
  onMove?: (from: string, to: string, promotion?: PromotionPiece) => void;
  shapes?: Array<{ orig: string; dest?: string; brush?: string }>;
  /** Max px, responsive via ResizeObserver. Défaut 480. */
  size?: number;
  /** Retour visuel sur le dernier coup : "good" = flash vert, "bad" = flash rouge. */
  moveResult?: "good" | "bad" | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function brushColor(brush?: string): string {
  if (brush === "green") return "rgba(50,200,80,0.85)";
  if (brush === "red") return "rgba(230,50,50,0.85)";
  if (brush === "yellow") return "rgba(255,220,0,0.85)";
  return "rgba(100,170,255,0.85)"; // paleBlue / default
}

function kingSquare(fen: string, color: "white" | "black"): string | null {
  const king = color === "white" ? "K" : "k";
  const rows = fen.split(" ")[0]!.split("/");
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[r]!) {
      if (ch >= "1" && ch <= "8") { file += parseInt(ch, 10); continue; }
      if (ch === king) return String.fromCharCode(97 + file) + (8 - r);
      file++;
    }
  }
  return null;
}

function isPromoMove(pieceType: string, targetSquare: string): boolean {
  return (pieceType === "wP" && targetSquare.endsWith("8")) ||
         (pieceType === "bP" && targetSquare.endsWith("1"));
}

function pieceTypeAt(fen: string, square: string): string | null {
  const col = square.charCodeAt(0) - 97; // a=0
  const row = 8 - parseInt(square[1]!);  // "1"=7, "8"=0
  const rows = fen.split(" ")[0]!.split("/");
  const rowStr = rows[row];
  if (!rowStr) return null;
  let file = 0;
  for (const ch of rowStr) {
    if (ch >= "1" && ch <= "8") { file += parseInt(ch, 10); continue; }
    if (file === col) {
      const color = ch === ch.toUpperCase() ? "w" : "b";
      return color + ch.toUpperCase();
    }
    file++;
  }
  return null;
}

const DOT_STYLE: CSSProperties = {
  background: "radial-gradient(circle, rgba(226,182,90,0.6) 28%, transparent 68%)",
  borderRadius: "50%",
};

const PROMOTION_LABELS: { piece: PromotionPiece; label: string }[] = [
  { piece: "q", label: "D" },
  { piece: "r", label: "T" },
  { piece: "b", label: "F" },
  { piece: "n", label: "C" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ZugBoard({
  fen,
  orientation = "white",
  movableColor,
  dests,
  lastMove,
  check,
  onMove,
  shapes,
  size = 480,
  moveResult,
}: ZugBoardProps) {
  const { wrapperRef, effectiveSize } = useResizeBoardSize(size);
  const [selected, setSelected] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, CSSProperties>>({});
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null);
  const [flashStyles, setFlashStyles] = useState<Record<string, CSSProperties>>({});
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flash on moveResult change
  useEffect(() => {
    if (!moveResult || !lastMove) return;
    const color = moveResult === "good"
      ? "rgba(50,200,80,0.55)"
      : "rgba(230,50,50,0.55)";
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashStyles({ [lastMove[1]]: { backgroundColor: color } });
    flashTimer.current = setTimeout(() => setFlashStyles({}), 650);
    return () => { if (flashTimer.current) clearTimeout(flashTimer.current); };
  }, [moveResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selection when fen changes (move played or position reset)
  useEffect(() => {
    setSelected(null);
    setOptionSquares({});
    setPendingPromo(null);
  }, [fen]);

  function selectSquare(square: string) {
    const targets = dests?.get(square);
    if (targets) {
      setSelected(square);
      const styles: Record<string, CSSProperties> = {};
      for (const t of targets) styles[t] = DOT_STYLE;
      setOptionSquares(styles);
    } else {
      setSelected(null);
      setOptionSquares({});
    }
  }

  function handleSquareClick({ square }: { square: string; piece: null | { pieceType: string } }) {
    if (!movableColor || !dests) return;

    // If promotion dialog is open, ignore board clicks
    if (pendingPromo) return;

    if (selected) {
      const targets = dests.get(selected) ?? [];
      if (targets.includes(square)) {
        // Check if promotion
        const pt = pieceTypeAt(fen, selected);
        if (pt && isPromoMove(pt, square)) {
          setPendingPromo({ from: selected, to: square });
          setSelected(null);
          setOptionSquares({});
          return;
        }
        onMove?.(selected, square);
        return;
      }
    }

    // Select or re-select
    selectSquare(square);
  }

  function handlePieceDrop({ piece, sourceSquare, targetSquare }: {
    piece: { isSparePiece: boolean; position: string; pieceType: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!movableColor || !dests || !targetSquare) return false;
    const targets = dests.get(sourceSquare);
    if (!targets?.includes(targetSquare)) return false;

    if (isPromoMove(piece.pieceType, targetSquare)) {
      setPendingPromo({ from: sourceSquare, to: targetSquare });
      return false; // board stays at current fen; overlay handles it
    }

    onMove?.(sourceSquare, targetSquare);
    return false; // always return false — trainer owns the fen, not react-chessboard
  }

  function commitPromotion(promo: PromotionPiece) {
    if (!pendingPromo) return;
    const { from, to } = pendingPromo;
    setPendingPromo(null);
    onMove?.(from, to, promo);
  }

  // Build squareStyles
  const squareStyles: Record<string, CSSProperties> = {};

  // Last move highlight
  if (lastMove) {
    const dim = "rgba(255,255,0,0.22)";
    squareStyles[lastMove[0]] = { backgroundColor: dim };
    squareStyles[lastMove[1]] = { backgroundColor: dim };
  }

  // Check highlight
  if (check && movableColor) {
    const ks = kingSquare(fen, movableColor);
    if (ks) squareStyles[ks] = { backgroundColor: "rgba(230,50,50,0.45)" };
  }

  // Selected square
  if (selected) {
    squareStyles[selected] = { backgroundColor: "rgba(226,182,90,0.35)" };
  }

  // Option squares (legal move dots)
  Object.assign(squareStyles, optionSquares);

  // Flash (moveResult)
  Object.assign(squareStyles, flashStyles);

  // Arrows from shapes
  const arrows = (shapes ?? [])
    .filter((s) => s.dest)
    .map((s) => ({ startSquare: s.orig, endSquare: s.dest!, color: brushColor(s.brush) }));

  return (
    <div ref={wrapperRef} style={{ width: "100%", maxWidth: size, position: "relative" }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          boardStyle: { width: effectiveSize, height: effectiveSize },
          animationDurationInMs: 180,
          showNotation: true,
          allowDragging: !!movableColor,
          allowDrawingArrows: false,
          canDragPiece: ({ piece }) => {
            if (!movableColor) return false;
            const myPrefix = movableColor === "white" ? "w" : "b";
            return piece.pieceType.startsWith(myPrefix);
          },
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          squareStyles,
          arrows,
        }}
      />

      {/* Promotion overlay (click-to-move or dropped pawn) */}
      {pendingPromo && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="flex gap-2 rounded-xl bg-white p-3 shadow-2xl dark:bg-neutral-800">
            {PROMOTION_LABELS.map(({ piece, label }) => (
              <button
                key={piece}
                type="button"
                onClick={() => commitPromotion(piece)}
                className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-neutral-900 text-xl font-bold hover:bg-brand-gold/10 dark:border-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type * as cg from "@lichess-org/chessground/types";
import { useEffect, useRef, useState } from "react";
import { useResizeBoardSize } from "@/hooks/use-resize-board-size";

export type PromotionPiece = "q" | "r" | "b" | "n";

export interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  /** Camp autorisé à jouer sur cet échiquier ; aucun si `undefined` (coup joué par le juge). */
  movableColor?: "white" | "black";
  /** Cases de départ -> cases d'arrivée légales, pour restreindre le glisser-déposer au juge. */
  dests?: Map<string, string[]>;
  lastMove?: [string, string];
  check?: boolean;
  onMove?: (from: string, to: string, promotion?: PromotionPiece) => void;
  /** Flèches ou surlignages automatiques (ex. indice meilleur coup). */
  shapes?: Array<{ orig: string; dest?: string; brush?: string }>;
  /** Taille de l'échiquier en pixels (défaut 360). */
  size?: number;
}

const PROMOTION_CHOICES: Array<{ piece: PromotionPiece; label: string }> = [
  { piece: "q", label: "D" },
  { piece: "r", label: "T" },
  { piece: "b", label: "F" },
  { piece: "n", label: "C" },
];

/** Enveloppe React fine autour de chessground (lib de l'échiquier de Lichess) : pas de logique de jeu ici. */
export function ChessBoard({ fen, orientation, movableColor, dests, lastMove, check, onMove, shapes, size = 480 }: ChessBoardProps) {
  const { wrapperRef, effectiveSize } = useResizeBoardSize(size);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string; color: "white" | "black" } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const api = Chessground(containerRef.current, {
      coordinates: true,
      movable: {
        events: {
          after: (orig, dest) => {
            const piece = api.state.pieces.get(dest);
            const isPromotion = piece?.role === "pawn" && (dest.endsWith("8") || dest.endsWith("1"));
            if (isPromotion) {
              setPendingPromotion({ from: orig, to: dest, color: piece.color });
            } else {
              onMoveRef.current?.(orig, dest);
            }
          },
        },
      },
    });
    apiRef.current = api;
    return () => api.destroy();
  }, []);

  useEffect(() => {
    const config: Config = {
      fen,
      orientation,
      turnColor: movableColor,
      check,
      lastMove: lastMove as cg.Key[] | undefined,
      highlight: { lastMove: true, check: true },
      movable: {
        free: false,
        color: movableColor,
        dests: dests as cg.Dests | undefined,
        showDests: true,
      },
      drawable: {
        autoShapes: (shapes ?? []).map((s) => ({
          orig: s.orig as cg.Key,
          dest: s.dest as cg.Key | undefined,
          brush: s.brush ?? "paleBlue",
        })),
      },
    };
    apiRef.current?.set(config);
  }, [fen, orientation, movableColor, dests, lastMove, check, shapes]);

  useEffect(() => {
    apiRef.current?.redrawAll();
  }, [effectiveSize]);

  function choosePromotion(piece: PromotionPiece) {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    onMoveRef.current?.(from, to, piece);
  }

  return (
    <div ref={wrapperRef} style={{ width: "100%", maxWidth: size }}>
      <div style={{ position: "relative", width: effectiveSize, height: effectiveSize }}>
        <div ref={containerRef} style={{ width: effectiveSize, height: effectiveSize }} />
        {pendingPromotion && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="flex gap-2 rounded-md bg-white p-3 shadow-lg dark:bg-neutral-800">
              {PROMOTION_CHOICES.map(({ piece, label }) => (
                <button
                  key={piece}
                  type="button"
                  onClick={() => choosePromotion(piece)}
                  className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-neutral-900 text-xl font-bold dark:border-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

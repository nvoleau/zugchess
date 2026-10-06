"use client";

import "@lichess-org/chessground/assets/chessground.base.css";
import "@lichess-org/chessground/assets/chessground.brown.css";
import "@lichess-org/chessground/assets/chessground.cburnett.css";

import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Config } from "@lichess-org/chessground/config";
import type * as cg from "@lichess-org/chessground/types";
import { useEffect, useRef } from "react";

export interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  /** Camp autorisé à jouer sur cet échiquier ; aucun si `undefined` (coup joué par le juge). */
  movableColor?: "white" | "black";
  /** Cases de départ -> cases d'arrivée légales, pour restreindre le glisser-déposer au juge. */
  dests?: Map<string, string[]>;
  lastMove?: [string, string];
  check?: boolean;
  onMove?: (from: string, to: string) => void;
}

/** Enveloppe React fine autour de chessground (lib de l'échiquier de Lichess) : pas de logique de jeu ici. */
export function ChessBoard({ fen, orientation, movableColor, dests, lastMove, check, onMove }: ChessBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;
    const api = Chessground(containerRef.current, {
      movable: {
        events: {
          after: (orig, dest) => onMoveRef.current?.(orig, dest),
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
    };
    apiRef.current?.set(config);
  }, [fen, orientation, movableColor, dests, lastMove, check]);

  return <div ref={containerRef} style={{ width: 360, height: 360 }} />;
}

import type { SquareMove } from "@zugchess/core";
import { Chess } from "chess.js";

/** Construit la map `case de départ -> cases d'arrivée légales` attendue par ZugBoard. */
export function legalDests(chess: Chess, color: "w" | "b"): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  for (const move of chess.moves({ verbose: true })) {
    if (move.color !== color) continue;
    const list = dests.get(move.from) ?? [];
    list.push(move.to);
    dests.set(move.from, list);
  }
  return dests;
}

const FRENCH_PIECE_LETTER: Record<string, string> = { K: "R", Q: "D", R: "T", B: "F", N: "C" };

/** Traduit la notation SAN (anglaise, chess.js) en notation française : K/Q/R/B/N -> R/D/T/F/C. */
export function frenchSan(san: string): string {
  return san.replace(/^[KQRBN]/, (letter) => FRENCH_PIECE_LETTER[letter]!).replace(/=([QRBN])/, (_, p) => `=${FRENCH_PIECE_LETTER[p]}`);
}

export type Color = "white" | "black";

/** Couleur réelle du camp qui possède le pion dans une FEN roi + pion contre roi. */
export function attackerColorOf(fen: string): Color {
  const placement = fen.split(" ")[0]!;
  return placement.includes("P") ? "white" : "black";
}

/** Nombre de pièces (tous camps confondus) sur l'échiquier décrit par une FEN. */
export function pieceCountOf(fen: string): number {
  const placement = fen.split(" ")[0]!;
  return placement.replace(/[^a-zA-Z]/g, "").length;
}

/** Rejoue une suite de coups depuis une FEN et renvoie la notation française, coup par coup. */
export function sanSequence(fen: string, moves: SquareMove[]): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const move of moves) {
    const played = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!played) break;
    sans.push(frenchSan(played.san));
  }
  return sans;
}

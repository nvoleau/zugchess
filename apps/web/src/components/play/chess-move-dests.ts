import type { Chess } from "chess.js";

/** Construit la map `case de départ -> cases d'arrivée légales` attendue par chessground. */
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

/** Promotion dame si le coup en est une, sinon `undefined` — ne force la promotion que si le pion atteint la dernière rangée. */
export function queenPromotionIfNeeded(chess: Chess, from: string, to: string): "q" | undefined {
  const piece = chess.get(from as Parameters<Chess["get"]>[0]);
  return piece?.type === "p" && (to.endsWith("8") || to.endsWith("1")) ? "q" : undefined;
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

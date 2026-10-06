import type { SquareMove } from "./types.js";

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface MethodLineStep {
  /** Coup attendu, ex: `{ from: "c1", to: "c4" }`. */
  move: SquareMove;
  /** Commentaire pédagogique affiché une fois ce coup joué. */
  comment: LocalizedText;
}

export interface MethodLine {
  /** FEN de départ de la ligne. */
  fen: string;
  /** Camp joué par l'élève ; l'autre camp est joué automatiquement par le juge. */
  playerSide: "white" | "black";
  /** Coups alternés en commençant par le trait de la FEN de départ. */
  steps: MethodLineStep[];
}

function sideToMoveAt(line: MethodLine, stepIndex: number): "white" | "black" {
  const startSide = line.fen.split(" ")[1] === "w" ? "white" : "black";
  const flips = stepIndex % 2 === 1;
  if (!flips) return startSide;
  return startSide === "white" ? "black" : "white";
}

/** Est-ce à l'élève de jouer à cette étape, ou au juge de répondre automatiquement ? */
export function isPlayerStep(line: MethodLine, stepIndex: number): boolean {
  return sideToMoveAt(line, stepIndex) === line.playerSide;
}

export interface MethodLineJudgement {
  correct: boolean;
  comment?: LocalizedText;
  hint?: LocalizedText;
  lineComplete: boolean;
}

function sameMove(a: SquareMove, b: SquareMove): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}

/**
 * Compare le coup tenté par l'élève au coup attendu de la ligne de référence. Le juge ne
 * revalide pas la légalité du coup (déjà garantie par l'échiquier côté UI) : il ne fait que
 * comparer à la méthode attendue.
 */
export function judgeMethodLineMove(
  line: MethodLine,
  stepIndex: number,
  attempted: SquareMove,
): MethodLineJudgement {
  const expected = line.steps[stepIndex];
  if (!expected) {
    throw new Error("La ligne de méthode est déjà terminée.");
  }

  if (!sameMove(expected.move, attempted)) {
    return {
      correct: false,
      hint: {
        fr: `Ce n'est pas le bon coup. Indice : ${expected.comment.fr}`,
        en: `That's not the right move. Hint: ${expected.comment.en}`,
      },
      lineComplete: false,
    };
  }

  return {
    correct: true,
    comment: expected.comment,
    lineComplete: stepIndex + 1 >= line.steps.length,
  };
}

import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { isPlayerStep, judgeMethodLineMove, type MethodLine, type MethodLineStep } from "../../src/judge/methodLine.js";
import type { SquareMove } from "../../src/judge/types.js";

/**
 * Construit les étapes d'une ligne de méthode à partir d'une FEN de départ et d'une suite de
 * coups en SAN : chess.js rejoue la ligne pour garantir la légalité et dérive les coups UCI
 * attendus par le juge. Les commentaires sont des textes de test, pas du contenu pédagogique réel.
 */
function buildSteps(fen: string, sanMoves: string[]): MethodLineStep[] {
  const chess = new Chess(fen);
  return sanMoves.map((san) => {
    const move = chess.move(san);
    if (!move) throw new Error(`coup illégal: ${san} depuis ${chess.fen()}`);
    const squareMove: SquareMove = { from: move.from, to: move.to };
    if (move.promotion) squareMove.promotion = move.promotion as SquareMove["promotion"];
    return { move: squareMove, comment: { fr: `Coup ${san}`, en: `Move ${san}` } };
  });
}

function lineFrom(fen: string, playerSide: MethodLine["playerSide"], sanMoves: string[]): MethodLine {
  return { fen, playerSide, steps: buildSteps(fen, sanMoves) };
}

describe("judgeMethodLineMove — 5 lignes de méthode de référence", () => {
  const cases: Array<[string, MethodLine]> = [
    ["Lucena", lineFrom("8/4PK2/8/6k1/8/8/8/R6r w - - 0 1", "white", ["Ra4", "Rh7", "Ke6"])],
    ["Philidor", lineFrom("4k3/8/8/8/4KP2/8/8/r6R w - - 0 1", "white", ["Rh8+", "Kd7", "Ra8"])],
    ["Reti", lineFrom("7K/8/k7/7P/8/8/8/8 w - - 0 1", "white", ["Kg7", "Kb6", "Kf6"])],
    ["Percee", lineFrom("7k/p7/8/1PP5/8/8/8/K7 w - - 0 1", "white", ["b6", "axb6", "c6"])],
    ["TempoReserve", lineFrom("4k3/8/3K4/3P3P/8/8/8/8 w - - 0 1", "white", ["Kc6", "Ke7", "Kc7"])],
  ];

  it.each(cases)("%s : joue toute la ligne et la marque complète au dernier coup", (_name, line) => {
    line.steps.forEach((step, index) => {
      const judgement = judgeMethodLineMove(line, index, step.move);
      expect(judgement.correct).toBe(true);
      expect(judgement.comment).toEqual(step.comment);
      expect(judgement.lineComplete).toBe(index === line.steps.length - 1);
    });
  });

  it.each(cases)("%s : un coup différent du coup attendu donne un indice, pas une validation", (_name, line) => {
    const expected = line.steps[0]!.move;
    const wrongMove: SquareMove = { from: expected.from, to: expected.from === "a1" ? "a2" : "a1" };
    const judgement = judgeMethodLineMove(line, 0, wrongMove);
    expect(judgement.correct).toBe(false);
    expect(judgement.lineComplete).toBe(false);
    expect(judgement.hint?.fr).toContain(line.steps[0]!.comment.fr);
  });

  it("une promotion différente de celle attendue n'est pas acceptée", () => {
    const line: MethodLine = {
      fen: "8/4P3/8/8/8/8/8/k6K w - - 0 1",
      playerSide: "white",
      steps: [{ move: { from: "e7", to: "e8", promotion: "q" }, comment: { fr: "Promotion dame", en: "Promote to queen" } }],
    };
    const judgement = judgeMethodLineMove(line, 0, { from: "e7", to: "e8", promotion: "r" });
    expect(judgement.correct).toBe(false);
  });

  it("juger un coup au-delà de la fin de la ligne lève une erreur", () => {
    const line = lineFrom("7K/8/k7/7P/8/8/8/8 w - - 0 1", "white", ["Kg7"]);
    expect(() => judgeMethodLineMove(line, line.steps.length, line.steps[0]!.move)).toThrow();
  });
});

describe("isPlayerStep — alternance des camps", () => {
  it("le joueur commence si son camp correspond au trait de départ (blanc)", () => {
    const line = lineFrom("7K/8/k7/7P/8/8/8/8 w - - 0 1", "white", ["Kg7", "Kb6", "Kf6"]);
    expect(isPlayerStep(line, 0)).toBe(true);
    expect(isPlayerStep(line, 1)).toBe(false);
    expect(isPlayerStep(line, 2)).toBe(true);
  });

  it("le joueur attend le premier coup si son camp ne correspond pas au trait de départ (noir)", () => {
    const line: MethodLine = {
      fen: "7K/8/k7/7P/8/8/8/8 w - - 0 1",
      playerSide: "black",
      steps: [],
    };
    expect(isPlayerStep(line, 0)).toBe(false);
    expect(isPlayerStep(line, 1)).toBe(true);
  });
});

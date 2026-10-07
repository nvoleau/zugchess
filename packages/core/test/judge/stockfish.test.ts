import { describe, expect, it } from "vitest";
import { invertScore, judgeStockfishMove, type EngineScore } from "../../src/judge/stockfish.js";

describe("invertScore", () => {
  it("inverse un score en centipions", () => {
    expect(invertScore({ type: "cp", value: 120 })).toEqual({ type: "cp", value: -120 });
  });

  it("inverse un score de mat (mater devient se faire mater)", () => {
    expect(invertScore({ type: "mate", value: 3 })).toEqual({ type: "mate", value: -3 });
  });
});

describe("judgeStockfishMove", () => {
  const TOLERANCE = 50;

  it("le coup optimal ne perd rien : pas de blunder", () => {
    const before: EngineScore = { type: "cp", value: 300 };
    // après le coup optimal, l'adversaire est toujours à -300 de son point de vue
    const after: EngineScore = { type: "cp", value: -300 };
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.lostCentipawns).toBe(0);
    expect(judged.blundered).toBe(false);
  });

  it("une perte en-dessous du seuil de tolérance est acceptée", () => {
    const before: EngineScore = { type: "cp", value: 300 };
    const after: EngineScore = { type: "cp", value: -270 }; // 30 cp perdus, sous le seuil de 50
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.lostCentipawns).toBe(30);
    expect(judged.blundered).toBe(false);
  });

  it("une perte au-delà du seuil de tolérance est un blunder", () => {
    const before: EngineScore = { type: "cp", value: 300 };
    const after: EngineScore = { type: "cp", value: -100 }; // 200 cp perdus, au-delà du seuil
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.lostCentipawns).toBe(200);
    expect(judged.blundered).toBe(true);
  });

  it("un coup qui améliore le score ne perd jamais rien (clampé à 0)", () => {
    const before: EngineScore = { type: "cp", value: 100 };
    const after: EngineScore = { type: "cp", value: -400 }; // le joueur se retrouve encore mieux
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.lostCentipawns).toBe(0);
    expect(judged.blundered).toBe(false);
  });

  it("laisser échapper un mat forcé pour une simple avance matérielle est toujours un blunder, même avec une tolérance large", () => {
    const before: EngineScore = { type: "mate", value: 4 }; // mat en 4 pour le joueur
    const after: EngineScore = { type: "cp", value: -250 }; // l'adversaire n'a plus "que" 250 cp de retard
    const judged = judgeStockfishMove(before, after, 1000);
    expect(judged.blundered).toBe(true);
  });

  it("mater plus vite qu'annoncé n'est jamais un blunder", () => {
    const before: EngineScore = { type: "mate", value: 5 };
    const after: EngineScore = { type: "mate", value: -4 }; // l'adversaire est maintenant maté en 4 (plus rapide)
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.blundered).toBe(false);
    expect(judged.lostCentipawns).toBe(0);
  });

  it("mater un demi-coup plus lentement qu'optimal coûte un peu, mais reste accepté", () => {
    const before: EngineScore = { type: "mate", value: 2 }; // mat en 2 pour le joueur
    const after: EngineScore = { type: "mate", value: -3 }; // l'adversaire se fait toujours mater, mais en 3 (plus lent)
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.lostCentipawns).toBeGreaterThan(0);
    expect(judged.blundered).toBe(false);
  });

  it("tomber dans le pat depuis une position gagnante est le pire des blunders", () => {
    const before: EngineScore = { type: "mate", value: 1 };
    const after: EngineScore = { type: "cp", value: 0 }; // pat : nulle immédiate
    const judged = judgeStockfishMove(before, after, TOLERANCE);
    expect(judged.blundered).toBe(true);
  });
});

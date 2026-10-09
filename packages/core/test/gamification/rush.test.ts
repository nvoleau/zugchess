import { describe, expect, it } from "vitest";
import {
  RUSH_DURATION_MS,
  RUSH_MAX_ERRORS,
  RUSH_MAX_RATING,
  RUSH_START_RATING,
  createSeededRandom,
  isRushOver,
  isRushTimeUp,
  nextRushTargetRating,
  pickSeeded,
  rushRemainingMs,
} from "../../src/gamification/rush.js";

describe("nextRushTargetRating", () => {
  it("démarre à la cote de départ pour un score de 0", () => {
    expect(nextRushTargetRating(0)).toBe(RUSH_START_RATING);
  });

  it("augmente avec le score", () => {
    expect(nextRushTargetRating(5)).toBeGreaterThan(nextRushTargetRating(2));
  });

  it("est plafonnée à la cote maximale", () => {
    expect(nextRushTargetRating(1000)).toBe(RUSH_MAX_RATING);
  });
});

describe("isRushOver", () => {
  it("n'est pas terminé avant le seuil d'erreurs", () => {
    expect(isRushOver(RUSH_MAX_ERRORS - 1)).toBe(false);
  });

  it("est terminé au seuil d'erreurs", () => {
    expect(isRushOver(RUSH_MAX_ERRORS)).toBe(true);
  });
});

describe("rushRemainingMs / isRushTimeUp", () => {
  it("retourne la durée complète au départ", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    expect(rushRemainingMs(startedAt, startedAt)).toBe(RUSH_DURATION_MS);
    expect(isRushTimeUp(startedAt, startedAt)).toBe(false);
  });

  it("décompte le temps écoulé", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date(startedAt.getTime() + 60_000);
    expect(rushRemainingMs(startedAt, now)).toBe(RUSH_DURATION_MS - 60_000);
  });

  it("ne descend jamais sous zéro et signale la fin du temps", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date(startedAt.getTime() + RUSH_DURATION_MS + 60_000);
    expect(rushRemainingMs(startedAt, now)).toBe(0);
    expect(isRushTimeUp(startedAt, now)).toBe(true);
  });
});

describe("createSeededRandom", () => {
  it("produit toujours la même séquence pour la même graine", () => {
    const a = createSeededRandom("abc");
    const b = createSeededRandom("abc");
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produit des séquences différentes pour des graines différentes", () => {
    const a = createSeededRandom("abc");
    const b = createSeededRandom("xyz");
    expect(a()).not.toBe(b());
  });

  it("produit des valeurs dans [0, 1)", () => {
    const random = createSeededRandom("zugchess");
    for (let i = 0; i < 50; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pickSeeded", () => {
  it("tire toujours le même élément pour la même graine", () => {
    const items = ["a", "b", "c", "d", "e"];
    const pickA = pickSeeded(items, createSeededRandom("seed-1"));
    const pickB = pickSeeded(items, createSeededRandom("seed-1"));
    expect(pickA).toBe(pickB);
  });

  it("lève une erreur sur une liste vide", () => {
    expect(() => pickSeeded([], createSeededRandom("seed"))).toThrow();
  });
});

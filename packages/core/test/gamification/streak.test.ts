import { describe, expect, it } from "vitest";
import { advanceStreak, type StreakState } from "../../src/gamification/streak.js";

describe("advanceStreak", () => {
  it("démarre une série de 1 à la première séance", () => {
    const { next, incremented } = advanceStreak(null, "2026-01-01");
    expect(incremented).toBe(true);
    expect(next).toEqual({ current: 1, best: 1, freezes: 0, lastDay: "2026-01-01" });
  });

  it("ne change rien si la séance du jour est déjà faite", () => {
    const state: StreakState = { current: 3, best: 3, freezes: 0, lastDay: "2026-01-03" };
    const { next, incremented } = advanceStreak(state, "2026-01-03");
    expect(incremented).toBe(false);
    expect(next).toEqual(state);
  });

  it("incrémente la série un jour consécutif plus tard", () => {
    const state: StreakState = { current: 3, best: 3, freezes: 0, lastDay: "2026-01-03" };
    const { next, incremented } = advanceStreak(state, "2026-01-04");
    expect(incremented).toBe(true);
    expect(next.current).toBe(4);
    expect(next.best).toBe(4);
  });

  it("gagne un gel tous les 7 jours, plafonné à 2", () => {
    const state: StreakState = { current: 6, best: 6, freezes: 0, lastDay: "2026-01-06" };
    const { next } = advanceStreak(state, "2026-01-07");
    expect(next.current).toBe(7);
    expect(next.freezes).toBe(1);
  });

  it("casse la série si plus d'un jour est manqué, sans gel disponible", () => {
    const state: StreakState = { current: 5, best: 5, freezes: 0, lastDay: "2026-01-01" };
    const { next, incremented, frozeUsed } = advanceStreak(state, "2026-01-05");
    expect(incremented).toBe(true);
    expect(frozeUsed).toBe(false);
    expect(next.current).toBe(1);
    expect(next.best).toBe(5); // le record est conservé
  });

  it("protège la série avec un gel si un seul jour est manqué", () => {
    const state: StreakState = { current: 5, best: 5, freezes: 1, lastDay: "2026-01-01" };
    const { next, frozeUsed } = advanceStreak(state, "2026-01-03");
    expect(frozeUsed).toBe(true);
    expect(next.current).toBe(6);
    expect(next.freezes).toBe(0);
  });

  describe("freezeConfig désactivé (gating Premium, chantier 4)", () => {
    it("ne fait jamais gagner de gel, même au 7e jour", () => {
      const state: StreakState = { current: 6, best: 6, freezes: 0, lastDay: "2026-01-06" };
      const { next } = advanceStreak(state, "2026-01-07", { enabled: false });
      expect(next.current).toBe(7);
      expect(next.freezes).toBe(0);
    });

    it("ne protège pas la série même si des gels sont déjà en stock", () => {
      const state: StreakState = { current: 5, best: 5, freezes: 1, lastDay: "2026-01-01" };
      const { next, frozeUsed } = advanceStreak(state, "2026-01-03", { enabled: false });
      expect(frozeUsed).toBe(false);
      expect(next.current).toBe(1); // série cassée malgré le gel en stock
      expect(next.freezes).toBe(1); // le gel en stock n'est pas consommé (gelé lui-même)
    });

    it("se comporte comme la config par défaut pour un jour consécutif simple", () => {
      const state: StreakState = { current: 3, best: 3, freezes: 0, lastDay: "2026-01-03" };
      const { next } = advanceStreak(state, "2026-01-04", { enabled: false });
      expect(next.current).toBe(4);
    });
  });
});

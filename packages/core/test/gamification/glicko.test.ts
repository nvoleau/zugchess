import { describe, expect, it } from "vitest";
import { gradeToScore, updateGlicko, type GlickoRating } from "../../src/gamification/glicko.js";

const BASE: GlickoRating = { rating: 1500, deviation: 350, volatility: 0.06 };

describe("gradeToScore", () => {
  it("mappe Again à 0", () => {
    expect(gradeToScore(1)).toBe(0);
  });

  it("mappe Hard à 0.5", () => {
    expect(gradeToScore(2)).toBe(0.5);
  });

  it("mappe Good et Easy à 1", () => {
    expect(gradeToScore(3)).toBe(1);
    expect(gradeToScore(4)).toBe(1);
  });
});

describe("updateGlicko", () => {
  it("augmente la cote après une victoire contre un adversaire de même niveau", () => {
    const next = updateGlicko(BASE, BASE, 1);
    expect(next.rating).toBeGreaterThan(BASE.rating);
  });

  it("diminue la cote après une défaite contre un adversaire de même niveau", () => {
    const next = updateGlicko(BASE, BASE, 0);
    expect(next.rating).toBeLessThan(BASE.rating);
  });

  it("laisse la cote quasiment inchangée pour un résultat nul (0.5) entre deux cotes égales", () => {
    const next = updateGlicko(BASE, BASE, 0.5);
    expect(next.rating).toBeCloseTo(BASE.rating, 0);
  });

  it("réduit toujours la déviation après une partie (plus de confiance)", () => {
    const next = updateGlicko(BASE, BASE, 1);
    expect(next.deviation).toBeLessThan(BASE.deviation);
  });

  it("une victoire contre plus fort rapporte plus de points qu'une victoire contre plus faible", () => {
    const weakerOpponent: GlickoRating = { rating: 1200, deviation: 80, volatility: 0.06 };
    const strongerOpponent: GlickoRating = { rating: 1800, deviation: 80, volatility: 0.06 };
    const player: GlickoRating = { rating: 1500, deviation: 80, volatility: 0.06 };

    const gainVsWeaker = updateGlicko(player, weakerOpponent, 1).rating - player.rating;
    const gainVsStronger = updateGlicko(player, strongerOpponent, 1).rating - player.rating;

    expect(gainVsStronger).toBeGreaterThan(gainVsWeaker);
  });

  it("une déviation faible (cote établie) varie moins qu'une déviation élevée (cote neuve)", () => {
    const establishedPlayer: GlickoRating = { rating: 1500, deviation: 50, volatility: 0.06 };
    const newPlayer: GlickoRating = { rating: 1500, deviation: 350, volatility: 0.06 };
    const opponent: GlickoRating = { rating: 1500, deviation: 80, volatility: 0.06 };

    const establishedDelta = Math.abs(updateGlicko(establishedPlayer, opponent, 1).rating - establishedPlayer.rating);
    const newDelta = Math.abs(updateGlicko(newPlayer, opponent, 1).rating - newPlayer.rating);

    expect(newDelta).toBeGreaterThan(establishedDelta);
  });

  it("reste pur : n'altère pas les objets passés en entrée", () => {
    const player = { ...BASE };
    const opponent = { ...BASE };
    updateGlicko(player, opponent, 1);
    expect(player).toEqual(BASE);
    expect(opponent).toEqual(BASE);
  });
});

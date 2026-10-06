import { describe, expect, it } from "vitest";
import {
  QuotaExceededError,
  assertCanConsume,
  getEntitlements,
  type DailyUsage,
} from "../src/entitlement/entitlementService.js";

function usage(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return { newPositions: 0, reviews: 0, explanations: 0, ...overrides };
}

describe("getEntitlements — plan gratuit", () => {
  it("autorise jusqu'à 3 nouvelles positions par jour", () => {
    expect(getEntitlements("free", usage({ newPositions: 2 })).canStartNewPosition).toBe(true);
    expect(getEntitlements("free", usage({ newPositions: 3 })).canStartNewPosition).toBe(false);
  });

  it("autorise jusqu'à 20 révisions par jour", () => {
    expect(getEntitlements("free", usage({ reviews: 19 })).canReview).toBe(true);
    expect(getEntitlements("free", usage({ reviews: 20 })).canReview).toBe(false);
  });

  it("autorise jusqu'à 3 explications par jour", () => {
    expect(getEntitlements("free", usage({ explanations: 2 })).canSeeExplanation).toBe(true);
    expect(getEntitlements("free", usage({ explanations: 3 })).canSeeExplanation).toBe(false);
  });

  it("calcule le quota restant", () => {
    const entitlements = getEntitlements("free", usage({ newPositions: 1, reviews: 5, explanations: 0 }));
    expect(entitlements.remaining).toEqual({ newPositions: 2, reviews: 15, explanations: 3 });
  });
});

describe("getEntitlements — plan premium", () => {
  it("n'a aucune limite", () => {
    const entitlements = getEntitlements(
      "premium",
      usage({ newPositions: 1000, reviews: 1000, explanations: 1000 }),
    );
    expect(entitlements.canStartNewPosition).toBe(true);
    expect(entitlements.canReview).toBe(true);
    expect(entitlements.canSeeExplanation).toBe(true);
    expect(entitlements.remaining).toEqual({
      newPositions: Infinity,
      reviews: Infinity,
      explanations: Infinity,
    });
  });
});

describe("assertCanConsume", () => {
  it("ne lève rien quand le quota n'est pas atteint", () => {
    expect(() => assertCanConsume("free", usage({ newPositions: 2 }), "newPositions")).not.toThrow();
  });

  it("lève QuotaExceededError une fois le quota gratuit atteint", () => {
    expect(() => assertCanConsume("free", usage({ newPositions: 3 }), "newPositions")).toThrow(
      QuotaExceededError,
    );
  });

  it("ne bloque jamais le plan premium", () => {
    expect(() =>
      assertCanConsume("premium", usage({ newPositions: 9999 }), "newPositions"),
    ).not.toThrow();
  });

  it("le lendemain (compteur remis à zéro) débloque à nouveau l'action", () => {
    const today = usage({ newPositions: 3 });
    expect(() => assertCanConsume("free", today, "newPositions")).toThrow(QuotaExceededError);

    const tomorrow = usage({ newPositions: 0 });
    expect(() => assertCanConsume("free", tomorrow, "newPositions")).not.toThrow();
  });
});

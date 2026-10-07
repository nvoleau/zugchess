import { describe, expect, it } from "vitest";
import { newCardState, rateReview, scheduleNextReview, type ReviewOutcome } from "../../src/scheduler/fsrs.js";

const BASE: ReviewOutcome = {
  blundered: false,
  abandoned: false,
  announceOk: true,
  tempoLost: false,
  hintRequested: false,
  moveDurationsMs: [1200, 800],
};

describe("rateReview — table SPEC.md", () => {
  it("Again (1) : au moins un coup perdant", () => {
    expect(rateReview({ ...BASE, blundered: true })).toBe(1);
  });

  it("Again (1) : abandon, même sans coup perdant", () => {
    expect(rateReview({ ...BASE, abandoned: true })).toBe(1);
  });

  it("Again (1) prime sur tout le reste (blunder et abandon en même temps)", () => {
    expect(rateReview({ ...BASE, blundered: true, abandoned: true, announceOk: false })).toBe(1);
  });

  it("Hard (2) : annonce fausse", () => {
    expect(rateReview({ ...BASE, announceOk: false })).toBe(2);
  });

  it("Hard (2) : au moins un temps perdu", () => {
    expect(rateReview({ ...BASE, tempoLost: true })).toBe(2);
  });

  it("Hard (2) : indice demandé", () => {
    expect(rateReview({ ...BASE, hintRequested: true })).toBe(2);
  });

  it("Good (3) : annonce juste, aucun écart, mais un coup lent", () => {
    expect(rateReview({ ...BASE, moveDurationsMs: [1000, 6000] })).toBe(3);
  });

  it("Good (3) si aucun temps de coup n'est fourni (on ne peut pas garantir la rapidité)", () => {
    expect(rateReview({ ...BASE, moveDurationsMs: [] })).toBe(3);
  });

  it("Easy (4) : annonce juste, aucun écart, tous les coups sous le seuil", () => {
    expect(rateReview({ ...BASE, moveDurationsMs: [1000, 2000, 4999] })).toBe(4);
  });

  it("le seuil est configurable", () => {
    expect(rateReview({ ...BASE, moveDurationsMs: [1500] }, 1000)).toBe(3);
    expect(rateReview({ ...BASE, moveDurationsMs: [900] }, 1000)).toBe(4);
  });
});

describe("newCardState / scheduleNextReview", () => {
  it("une carte neuve a 0 répétition et 0 échec", () => {
    const card = newCardState(new Date("2026-01-01T00:00:00Z"));
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });

  it("noter Again avance quand même l'échéance, mais bien moins loin qu'un Easy", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const card = newCardState(now);

    const again = scheduleNextReview(card, 1, now);
    const easy = scheduleNextReview(card, 4, now);

    expect(again.due.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(easy.due.getTime()).toBeGreaterThan(again.due.getTime());
  });

  it("une carte oubliée après avoir été maîtrisée (état Review) revient avec un lapse de plus", () => {
    // `lapses` ne compte que les oublis après la phase d'apprentissage initiale (état Review ->
    // Relearning) : il faut d'abord faire graduer la carte avec plusieurs Good avant de la rater.
    let now = new Date("2026-01-01T00:00:00Z");
    let card = newCardState(now);
    for (let i = 0; i < 5; i++) {
      const result = scheduleNextReview(card, 3, now);
      card = result.card;
      now = result.due;
    }
    expect(card.state).toBe(2); // State.Review

    const failed = scheduleNextReview(card, 1, now);
    expect(failed.card.lapses).toBeGreaterThan(card.lapses);
  });

  it("enchaîner plusieurs Good repousse l'échéance de plus en plus loin (stabilité croissante)", () => {
    let now = new Date("2026-01-01T00:00:00Z");
    let card = newCardState(now);
    let previousInterval = 0;
    for (let i = 0; i < 4; i++) {
      const result = scheduleNextReview(card, 3, now);
      const interval = result.due.getTime() - now.getTime();
      expect(interval).toBeGreaterThanOrEqual(previousInterval);
      previousInterval = interval;
      card = result.card;
      now = result.due;
    }
  });
});

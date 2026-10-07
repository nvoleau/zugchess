import { createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";

export type { Card as FsrsCardState };

/** Note FSRS 1 à 4 (Again/Hard/Good/Easy) — jamais Manual (0), qui n'a pas de sens pour une révision automatique. */
export type ReviewGrade = 1 | 2 | 3 | 4;

const DEFAULT_FAST_MOVE_THRESHOLD_MS = 5000;

export interface ReviewOutcome {
  /** Au moins un coup a fait perdre le gain/la nulle (juge KPK/Syzygy) ou n'a pas suivi la ligne de méthode. */
  blundered: boolean;
  /** La séance a été quittée avant la fin de la position. */
  abandoned: boolean;
  /** L'annonce du résultat (Blancs gagnent / Nulle / Noirs gagnent) était correcte. */
  announceOk: boolean;
  /** Au moins un coup gagnait encore mais plus lentement que l'optimal. */
  tempoLost: boolean;
  /** L'élève a demandé un indice avant de jouer. */
  hintRequested: boolean;
  /** Temps de réflexion de chaque coup de l'élève, en millisecondes. */
  moveDurationsMs: number[];
}

/**
 * Calcule la note FSRS automatiquement à partir du déroulé de la révision (SPEC.md, « Répétition
 * espacée ») : le joueur ne s'auto-évalue jamais, le serveur reste seul juge.
 *
 * | Note | Condition |
 * | --- | --- |
 * | Again (1) | Au moins un coup perdant, ou abandon |
 * | Hard (2) | Annonce fausse, ou au moins un temps perdu, ou indice demandé |
 * | Good (3) | Annonce juste et aucun écart |
 * | Easy (4) | Annonce juste, aucun écart, et temps de réflexion sous le seuil pour chaque coup |
 */
export function rateReview(outcome: ReviewOutcome, fastMoveThresholdMs: number = DEFAULT_FAST_MOVE_THRESHOLD_MS): ReviewGrade {
  if (outcome.blundered || outcome.abandoned) return 1;
  if (!outcome.announceOk || outcome.tempoLost || outcome.hintRequested) return 2;

  const hasTiming = outcome.moveDurationsMs.length > 0;
  const allFast = hasTiming && outcome.moveDurationsMs.every((ms) => ms < fastMoveThresholdMs);
  return allFast ? 4 : 3;
}

/** Carte FSRS toute neuve (position jamais révisée), prête pour `scheduleNextReview`. */
export function newCardState(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export interface ScheduledReview {
  card: Card;
  due: Date;
}

/**
 * SchedulerService (SPEC.md) : calcule la prochaine échéance d'une carte via ts-fsrs, paramètres
 * par défaut (l'optimisation par joueur à partir de 200 révisions est un raffinement ultérieur, pas
 * nécessaire pour la planification de base).
 */
export function scheduleNextReview(card: Card, grade: ReviewGrade, now: Date = new Date()): ScheduledReview {
  const scheduler = fsrs();
  const { card: nextCard } = scheduler.next(card, now, grade as Grade);
  return { card: nextCard, due: nextCard.due };
}

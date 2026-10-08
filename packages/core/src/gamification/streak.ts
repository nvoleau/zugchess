/**
 * Gestion des séries quotidiennes (SPEC.md, section « Séries »).
 * Pur calcul — aucune dépendance externe.
 * Le fuseau du joueur est pris en compte par l'appelant (GamificationService),
 * qui passe la date locale sous la forme "YYYY-MM-DD".
 */

export interface StreakState {
  current: number;
  best: number;
  freezes: number;
  lastDay: string | null; // "YYYY-MM-DD" dans le fuseau du joueur
}

export interface StreakUpdate {
  next: StreakState;
  /** true si la série a été incrémentée ce jour (utile pour déclencher l'XP `session_complete`). */
  incremented: boolean;
  /** true si un gel a été consommé. */
  frozeUsed: boolean;
}

/** Nombre de jours entre deux dates "YYYY-MM-DD". */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Calcule l'état suivant de la série après la fin d'une séance.
 * @param state   état actuel (null si première séance)
 * @param today   date locale du joueur ("YYYY-MM-DD")
 */
export function advanceStreak(state: StreakState | null, today: string): StreakUpdate {
  const s: StreakState = state ?? { current: 0, best: 0, freezes: 0, lastDay: null };

  if (s.lastDay === today) {
    // Déjà terminé aujourd'hui — pas de changement.
    return { next: s, incremented: false, frozeUsed: false };
  }

  if (!s.lastDay) {
    // Première séance.
    const next: StreakState = { current: 1, best: Math.max(1, s.best), freezes: s.freezes, lastDay: today };
    return { next, incremented: true, frozeUsed: false };
  }

  const diff = dayDiff(s.lastDay, today);

  if (diff === 1) {
    // Jour consécutif.
    const current = s.current + 1;
    // Gel gagné tous les 7 jours (max 2).
    const freezeGained = current % 7 === 0 ? 1 : 0;
    const next: StreakState = {
      current,
      best: Math.max(current, s.best),
      freezes: Math.min(2, s.freezes + freezeGained),
      lastDay: today,
    };
    return { next, incremented: true, frozeUsed: false };
  }

  if (diff === 2 && s.freezes > 0) {
    // Un jour manqué protégé par un gel.
    const current = s.current + 1;
    const freezeGained = current % 7 === 0 ? 1 : 0;
    const next: StreakState = {
      current,
      best: Math.max(current, s.best),
      freezes: Math.min(2, s.freezes - 1 + freezeGained),
      lastDay: today,
    };
    return { next, incremented: true, frozeUsed: true };
  }

  // Série cassée.
  const next: StreakState = { current: 1, best: s.best, freezes: s.freezes, lastDay: today };
  return { next, incremented: true, frozeUsed: false };
}

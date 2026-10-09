export type Plan = "free" | "premium";

export interface PlanLimits {
  newPositionsPerDay: number;
  reviewsPerDay: number;
  explanationsPerDay: number;
  /** Chantier 4 : nombre de parties Zug Rush démarrables par jour. */
  rushRunsPerDay: number;
}

export const FREE_LIMITS: PlanLimits = {
  newPositionsPerDay: 3,
  reviewsPerDay: 20,
  explanationsPerDay: 3,
  rushRunsPerDay: 1,
};

export const PREMIUM_LIMITS: PlanLimits = {
  newPositionsPerDay: Infinity,
  reviewsPerDay: Infinity,
  explanationsPerDay: Infinity,
  rushRunsPerDay: Infinity,
};

export function getLimitsForPlan(plan: Plan): PlanLimits {
  return plan === "premium" ? PREMIUM_LIMITS : FREE_LIMITS;
}

/** Chantier 4 : fonctionnalités à bascule binaire (pas des quotas quotidiens). */
export interface PlanFeatures {
  /** Cotes ZugElo par famille visibles (en gratuit, seule la cote globale est visible). */
  familyRatingsVisible: boolean;
  /** Le gel de série (cf. packages/core/gamification/streak.ts) peut être gagné et consommé. */
  streakFreezeEnabled: boolean;
}

export const FREE_FEATURES: PlanFeatures = {
  familyRatingsVisible: false,
  streakFreezeEnabled: false,
};

export const PREMIUM_FEATURES: PlanFeatures = {
  familyRatingsVisible: true,
  streakFreezeEnabled: true,
};

export function getFeaturesForPlan(plan: Plan): PlanFeatures {
  return plan === "premium" ? PREMIUM_FEATURES : FREE_FEATURES;
}

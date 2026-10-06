export type Plan = "free" | "premium";

export interface PlanLimits {
  newPositionsPerDay: number;
  reviewsPerDay: number;
  explanationsPerDay: number;
}

export const FREE_LIMITS: PlanLimits = {
  newPositionsPerDay: 3,
  reviewsPerDay: 20,
  explanationsPerDay: 3,
};

export const PREMIUM_LIMITS: PlanLimits = {
  newPositionsPerDay: Infinity,
  reviewsPerDay: Infinity,
  explanationsPerDay: Infinity,
};

export function getLimitsForPlan(plan: Plan): PlanLimits {
  return plan === "premium" ? PREMIUM_LIMITS : FREE_LIMITS;
}

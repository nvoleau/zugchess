import { getFeaturesForPlan, getLimitsForPlan, type Plan, type PlanFeatures, type PlanLimits } from "./plans.js";

export type UsageKind = "newPositions" | "reviews" | "explanations" | "rushRuns";

export interface DailyUsage {
  newPositions: number;
  reviews: number;
  explanations: number;
  rushRuns: number;
}

export interface Entitlements {
  plan: Plan;
  limits: PlanLimits;
  features: PlanFeatures;
  usage: DailyUsage;
  remaining: DailyUsage;
  canStartNewPosition: boolean;
  canReview: boolean;
  canSeeExplanation: boolean;
  canStartRush: boolean;
}

export class QuotaExceededError extends Error {
  readonly kind: UsageKind;

  constructor(kind: UsageKind) {
    super(`Quota quotidien dépassé pour "${kind}"`);
    this.name = "QuotaExceededError";
    this.kind = kind;
  }
}

function remaining(limit: number, used: number): number {
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - used);
}

export function getEntitlements(plan: Plan, usage: DailyUsage): Entitlements {
  const limits = getLimitsForPlan(plan);

  return {
    plan,
    limits,
    features: getFeaturesForPlan(plan),
    usage,
    remaining: {
      newPositions: remaining(limits.newPositionsPerDay, usage.newPositions),
      reviews: remaining(limits.reviewsPerDay, usage.reviews),
      explanations: remaining(limits.explanationsPerDay, usage.explanations),
      rushRuns: remaining(limits.rushRunsPerDay, usage.rushRuns),
    },
    canStartNewPosition: usage.newPositions < limits.newPositionsPerDay,
    canReview: usage.reviews < limits.reviewsPerDay,
    canSeeExplanation: usage.explanations < limits.explanationsPerDay,
    canStartRush: usage.rushRuns < limits.rushRunsPerDay,
  };
}

/** Lève QuotaExceededError si l'action `kind` n'est plus autorisée aujourd'hui pour ce plan. */
export function assertCanConsume(plan: Plan, usage: DailyUsage, kind: UsageKind): void {
  const entitlements = getEntitlements(plan, usage);
  const allowed =
    kind === "newPositions"
      ? entitlements.canStartNewPosition
      : kind === "reviews"
        ? entitlements.canReview
        : kind === "explanations"
          ? entitlements.canSeeExplanation
          : entitlements.canStartRush;

  if (!allowed) {
    throw new QuotaExceededError(kind);
  }
}

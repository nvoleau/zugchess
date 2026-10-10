/**
 * GET /api/me/stats (SPEC.md) : Elo de finales, série, maîtrise par thème, XP/niveau.
 */
import { levelForXp } from "@zugchess/core";
import { prisma } from "./prisma";

export interface ThemeMastery {
  slug: string;
  title: string;
  total: number;
  mastered: number;     // stabilité FSRS > 7
  familiar: number;     // stabilité > 3
}

export interface FamilyRating {
  family: string;
  rating: number;
  deviation: number;
  bestRating: number | null;
}

export interface RatingHistoryPoint {
  family: string | null;
  rating: number;
  delta: number;
  createdAt: Date;
}

export interface WeakSpot {
  themeSlug: string;
  title: string;
  totalReviews: number;
  errorRate: number; // 0–1
}

export interface RushStats {
  runs: number;
  bestScore: number;
  totalCorrect: number;
  totalErrors: number;
}

export interface PlayerStats {
  rating: number;
  ratingDeviation: number;
  bestRating: number | null;
  totalXp: number;
  level: number;
  streak: { current: number; best: number; freezes: number };
  themeMastery: ThemeMastery[];
  /** Thèmes avec le taux d'erreur le plus élevé (min 3 révisions), triés du pire au meilleur. */
  weakSpots: WeakSpot[];
  /** Stats des Rush runs terminés. */
  rushStats: RushStats | null;
  /** Chantier 4 : cotes ZugElo par famille (`Theme.family`). */
  familyRatings: FamilyRating[];
  /** Chantier 4 : derniers points de la courbe de progression (cote globale), les plus récents en dernier. */
  ratingHistory: RatingHistoryPoint[];
}

const RATING_HISTORY_LIMIT = 30;

export async function getPlayerStats(userId: string, locale: "fr" | "en"): Promise<PlayerStats> {
  const [rating, xpAgg, streak, themes, cards, familyRatings, ratingHistoryRows, reviewLogsWithTheme, rushRuns] = await Promise.all([
    prisma.playerRating.findUnique({ where: { userId } }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.theme.findMany({ orderBy: { order: "asc" } }),
    prisma.card.findMany({
      where: { userId },
      select: {
        positionId: true,
        fsrsState: true,
        position: { select: { themeId: true } },
      },
    }),
    prisma.playerFamilyRating.findMany({ where: { userId }, orderBy: { rating: "desc" } }),
    prisma.ratingEvent.findMany({
      where: { userId, family: null },
      orderBy: { createdAt: "desc" },
      take: RATING_HISTORY_LIMIT,
    }),
    prisma.reviewLog.findMany({
      where: { userId },
      select: { errors: true, position: { select: { themeId: true } } },
    }),
    prisma.rushRun.findMany({
      where: { userId, status: "completed" },
      select: { score: true, errors: true },
    }),
  ]);

  const totalXp = xpAgg._sum.amount ?? 0;
  const level = levelForXp(totalXp);

  // Maîtrise par thème : compte les cartes selon leur stabilité FSRS
  const cardsByTheme = new Map<string, { total: number; stable7: number; stable3: number }>();

  for (const card of cards) {
    const themeId = card.position.themeId;
    const state = card.fsrsState as { stability?: number } | null;
    const stability = state?.stability ?? 0;
    const entry = cardsByTheme.get(themeId) ?? { total: 0, stable7: 0, stable3: 0 };
    entry.total++;
    if (stability >= 7) entry.stable7++;
    if (stability >= 3) entry.stable3++;
    cardsByTheme.set(themeId, entry);
  }

  // Compte de positions publiées par thème
  const positionCounts = await prisma.position.groupBy({
    by: ["themeId"],
    where: { status: "published" },
    _count: { id: true },
  });
  const posCountByTheme = new Map(positionCounts.map((r) => [r.themeId, r._count.id]));

  const themeMastery: ThemeMastery[] = themes.map((theme) => {
    const cm = cardsByTheme.get(theme.id);
    const title = (theme.title as Record<string, string>)[locale] ?? (theme.title as Record<string, string>)["fr"] ?? theme.slug;
    return {
      slug: theme.slug,
      title,
      total: posCountByTheme.get(theme.id) ?? 0,
      mastered: cm?.stable7 ?? 0,
      familiar: cm?.stable3 ?? 0,
    };
  });

  // Points faibles : taux d'erreur par thème (min 3 révisions, triés du pire au meilleur)
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const reviewsByTheme = new Map<string, { total: number; errors: number }>();
  for (const rl of reviewLogsWithTheme) {
    const themeId = rl.position.themeId;
    const entry = reviewsByTheme.get(themeId) ?? { total: 0, errors: 0 };
    entry.total++;
    if (rl.errors > 0) entry.errors++;
    reviewsByTheme.set(themeId, entry);
  }
  const weakSpots: WeakSpot[] = Array.from(reviewsByTheme.entries())
    .filter(([, v]) => v.total >= 3)
    .map(([themeId, v]) => {
      const theme = themeById.get(themeId);
      const title = theme
        ? ((theme.title as Record<string, string>)[locale] ?? (theme.title as Record<string, string>)["fr"] ?? theme.slug)
        : themeId;
      return {
        themeSlug: theme?.slug ?? themeId,
        title,
        totalReviews: v.total,
        errorRate: v.errors / v.total,
      };
    })
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  // Stats Rush
  const rushStats: RushStats | null = rushRuns.length === 0 ? null : {
    runs: rushRuns.length,
    bestScore: Math.max(...rushRuns.map((r) => r.score)),
    totalCorrect: rushRuns.reduce((s, r) => s + r.score, 0),
    totalErrors: rushRuns.reduce((s, r) => s + r.errors, 0),
  };

  return {
    rating: rating?.rating ?? 1500,
    ratingDeviation: rating?.deviation ?? 350,
    bestRating: rating?.bestRating ?? null,
    totalXp,
    level,
    streak: {
      current: streak?.current ?? 0,
      best: streak?.best ?? 0,
      freezes: streak?.freezes ?? 0,
    },
    themeMastery,
    weakSpots,
    rushStats,
    familyRatings: familyRatings.map((r) => ({
      family: r.family,
      rating: r.rating,
      deviation: r.deviation,
      bestRating: r.bestRating,
    })),
    // Renvoyé du plus ancien au plus récent, pour tracer la courbe dans l'ordre chronologique.
    ratingHistory: ratingHistoryRows.reverse().map((r) => ({
      family: r.family,
      rating: r.ratingAfter,
      delta: r.delta,
      createdAt: r.createdAt,
    })),
  };
}

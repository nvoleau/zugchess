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

export interface PlayerStats {
  rating: number;
  ratingDeviation: number;
  totalXp: number;
  level: number;
  streak: { current: number; best: number; freezes: number };
  themeMastery: ThemeMastery[];
}

export async function getPlayerStats(userId: string, locale: "fr" | "en"): Promise<PlayerStats> {
  const [rating, xpAgg, streak, themes, cards] = await Promise.all([
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

  return {
    rating: rating?.rating ?? 1500,
    ratingDeviation: rating?.deviation ?? 350,
    totalXp,
    level,
    streak: {
      current: streak?.current ?? 0,
      best: streak?.best ?? 0,
      freezes: streak?.freezes ?? 0,
    },
    themeMastery,
  };
}

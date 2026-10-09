/**
 * GET /api/leaderboards/:kind — classements publics (rating, xp, streak).
 * Seuls les joueurs avec `publicProfile = true` apparaissent.
 */
import { prisma } from "./prisma";

export type LeaderboardKind = "rating" | "xp" | "streak";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  value: number;
}

/** Filtre commun à tous les classements publics : profil public, non exclu pour anti-triche (chantier 4). */
const VISIBLE_USER = { publicProfile: true, excludedFromLeaderboards: false } as const;

export async function getLeaderboard(
  kind: LeaderboardKind,
  limit = 20,
  options?: { family?: string },
): Promise<LeaderboardEntry[]> {
  if (kind === "rating") {
    if (options?.family) {
      const rows = await prisma.playerFamilyRating.findMany({
        where: { family: options.family, user: VISIBLE_USER },
        orderBy: { rating: "desc" },
        take: limit,
        include: { user: { select: { name: true, image: true } } },
      });
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: r.user.name ?? "—",
        avatar: r.user.image,
        value: Math.round(r.rating),
      }));
    }

    const rows = await prisma.playerRating.findMany({
      where: { user: VISIBLE_USER },
      orderBy: { rating: "desc" },
      take: limit,
      include: { user: { select: { name: true, image: true } } },
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.user.name ?? "—",
      avatar: r.user.image,
      value: Math.round(r.rating),
    }));
  }

  if (kind === "xp") {
    const rows = await prisma.xpEvent.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });
    const userIds = rows.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, ...VISIBLE_USER },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return rows
      .filter((r) => userMap.has(r.userId))
      .map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        name: userMap.get(r.userId)?.name ?? "—",
        avatar: userMap.get(r.userId)?.image ?? null,
        value: r._sum.amount ?? 0,
      }));
  }

  // streak
  const rows = await prisma.streak.findMany({
    where: { user: VISIBLE_USER, current: { gt: 0 } },
    orderBy: { current: "desc" },
    take: limit,
    include: { user: { select: { name: true, image: true } } },
  });
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.user.name ?? "—",
    avatar: r.user.image,
    value: r.current,
  }));
}

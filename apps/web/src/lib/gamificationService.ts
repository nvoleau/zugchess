/**
 * GamificationService (SPEC.md, lot 6) : XP, Glicko-2, séries et trophées.
 * Appelé dans une transaction après chaque révision réussie.
 */
import {
  advanceStreak,
  computeReviewXp,
  gradeToScore,
  levelForXp,
  updateGlicko,
  type StreakState,
} from "@zugchess/core";
import { prisma } from "./prisma";

export interface GamificationResult {
  xpGained: number;
  totalXp: number;
  level: number;
  streak: { current: number; best: number; freezes: number };
  newAchievements: string[];
}

/** Convertit une date UTC en "YYYY-MM-DD" dans le fuseau du joueur. */
function todayInTz(timezone: string): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: timezone });
}

/**
 * Vérifie si cette position a déjà été révisée aujourd'hui par ce joueur
 * (pour éviter le double XP sur révision anticipée).
 */
async function isFirstReviewToday(userId: string, positionId: string, _timezone: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  // On utilise UTC 00:00 comme approximation simple ; idéalement on convertirait le fuseau.
  // Pour une v1 c'est acceptable.
  const count = await prisma.reviewLog.count({
    where: { userId, positionId, reviewedAt: { gte: todayStart } },
  });
  // La révision courante n'est pas encore en base, donc count === 0 ⟺ première révision du jour.
  return count === 0;
}

/** Calcule la somme totale d'XP pour un joueur depuis la table `XpEvent`. */
async function getTotalXp(userId: string): Promise<number> {
  const agg = await prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/**
 * Applique la gamification après une révision :
 * 1. XP selon la note et le contexte
 * 2. Mise à jour Glicko-2 joueur ↔ position
 * 3. Avance la série quotidienne
 * 4. Vérifie les trophées simples (streak, first_review)
 *
 * Doit être appelé APRÈS l'insertion du ReviewLog (hors transaction externe).
 */
export async function applyGamification(params: {
  userId: string;
  positionId: string;
  grade: number;
  isNewPosition: boolean;
  announceOk: boolean;
  errors: number;
}): Promise<GamificationResult> {
  const { userId, positionId, grade, isNewPosition, announceOk, errors } = params;

  const [user, position, existingRating, existingStreak, currentXp] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    prisma.position.findUnique({ where: { id: positionId }, select: { rating: true, ratingDeviation: true } }),
    prisma.playerRating.findUnique({ where: { userId } }),
    prisma.streak.findUnique({ where: { userId } }),
    getTotalXp(userId),
  ]);

  const timezone = user?.timezone ?? "Europe/Paris";
  const today = todayInTz(timezone);
  const isFirstToday = await isFirstReviewToday(userId, positionId, timezone);

  // --- 1. XP ---
  const rawGrants = computeReviewXp({ grade, isNewPosition, announceOk, isFirstToday, errors });

  // Clamp : le total XP ne descend jamais sous 0
  const positiveSum = rawGrants.filter((g) => g.amount > 0).reduce((s, g) => s + g.amount, 0);
  const negativeSum = rawGrants.filter((g) => g.amount < 0).reduce((s, g) => s + g.amount, 0);
  const floor = -(currentXp + positiveSum); // max perte autorisée
  const clampedNegative = Math.max(negativeSum, floor);

  const grants = rawGrants.map((g) =>
    g.amount < 0 && negativeSum !== 0
      ? { ...g, amount: Math.round(g.amount * (clampedNegative / negativeSum)) }
      : g,
  );

  let xpGained = grants.reduce((s, g) => s + g.amount, 0);

  const nonZeroGrants = grants.filter((g) => g.amount !== 0);
  if (nonZeroGrants.length > 0) {
    await prisma.xpEvent.createMany({
      data: nonZeroGrants.map((g) => ({ userId, amount: g.amount, reason: g.reason })),
    });
  }

  // --- 2. Glicko-2 ---
  const playerRating = existingRating ?? { rating: 1500, deviation: 350, volatility: 0.06 };
  const posRating = { rating: position?.rating ?? 1500, deviation: position?.ratingDeviation ?? 350, volatility: 0.06 };
  const score = gradeToScore(grade);
  if (isFirstToday) {
    const nextPlayer = updateGlicko(playerRating, posRating, score);
    await prisma.playerRating.upsert({
      where: { userId },
      create: { userId, ...nextPlayer, games: 1 },
      update: { ...nextPlayer, games: { increment: 1 }, updatedAt: new Date() },
    });
  }

  // --- 3. Série ---
  const streakState: StreakState | null = existingStreak
    ? { current: existingStreak.current, best: existingStreak.best, freezes: existingStreak.freezes, lastDay: existingStreak.lastDay }
    : null;
  const { next: nextStreak, incremented } = advanceStreak(streakState, today);

  if (incremented) {
    await prisma.streak.upsert({
      where: { userId },
      create: { userId, ...nextStreak },
      update: { current: nextStreak.current, best: nextStreak.best, freezes: nextStreak.freezes, lastDay: nextStreak.lastDay },
    });
    // XP séance quotidienne — une fois par jour.
    if (isFirstToday) {
      await prisma.xpEvent.create({ data: { userId, amount: 20, reason: "session_complete" } });
      xpGained += 20;
    }
  }

  // --- 4. Trophées simples ---
  const newAchievements = await checkAchievements(userId, nextStreak.current);

  const totalXp = await getTotalXp(userId);

  return {
    xpGained,
    totalXp,
    level: levelForXp(totalXp),
    streak: { current: nextStreak.current, best: nextStreak.best, freezes: nextStreak.freezes },
    newAchievements,
  };
}

/** Vérifie et débloque les trophées simples basés sur la série. */
async function checkAchievements(userId: string, streakCurrent: number): Promise<string[]> {
  const STREAK_MILESTONES = [7, 30, 100];
  const triggered: string[] = [];

  for (const days of STREAK_MILESTONES) {
    if (streakCurrent >= days) {
      const code = `streak_${days}`;
      const alreadyUnlocked = await prisma.userAchievement.findUnique({ where: { userId_code: { userId, code } } });
      if (!alreadyUnlocked) {
        const achievement = await prisma.achievement.findUnique({ where: { code } });
        if (achievement) {
          await prisma.userAchievement.create({ data: { userId, code } });
          triggered.push(code);
        }
      }
    }
  }

  return triggered;
}

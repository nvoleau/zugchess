import {
  buildSessionQueue,
  newCardState,
  rateReview,
  scheduleNextReview,
  type FsrsCardState,
  type ReviewGrade,
  type ReviewOutcome,
} from "@zugchess/core";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { consumeUsage, getEntitlementsForUser } from "./entitlements";
import { textsFor } from "./positionService";
import { applyGamification } from "./gamificationService";

/** `player_ratings` (SPEC.md) n'existe pas encore (lot Glicko à venir) : on compare à l'Elo de
 * finales par défaut pour trier les nouvelles positions par difficulté. */
const DEFAULT_PLAYER_RATING = 1500;

export interface SessionQueueEntry {
  positionId: string;
  kind: "due" | "new";
  themeSlug: string;
  title: string;
}

/** GET /api/session/today (SPEC.md) : cartes dues puis nouvelles positions, tronquées par les
 * réglages du joueur (`UserSettings`) ET par les quotas restants de son offre. */
export async function getTodaySession(userId: string, locale: "fr" | "en"): Promise<{ items: SessionQueueEntry[] }> {
  const now = new Date();

  const [settings, entitlements, dueRows, newRows] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    getEntitlementsForUser(userId),
    prisma.card.findMany({
      where: { userId, suspended: false, due: { lte: now } },
      select: { positionId: true, due: true },
    }),
    prisma.position.findMany({
      where: { status: "published", cards: { none: { userId } } },
      include: { theme: true },
      orderBy: [{ theme: { order: "asc" } }, { createdAt: "asc" }],
      take: 200,
    }),
  ]);

  const reviewQuota = Math.min(settings?.reviewsPerDay ?? 100, entitlements.remaining.reviews);
  const newQuota = Math.min(settings?.newPerDay ?? 10, entitlements.remaining.newPositions);

  const queue = buildSessionQueue({
    dueCards: dueRows.map((row) => ({ positionId: row.positionId, due: row.due })),
    newPositions: newRows.map((row) => ({
      positionId: row.id,
      themeOrder: row.theme.order,
      ratingDistance: Math.abs(row.rating - DEFAULT_PLAYER_RATING),
    })),
    reviewQuota,
    newQuota,
  });

  const positionsById = new Map(newRows.map((row) => [row.id, row]));
  const dueFullRows =
    dueRows.length > 0
      ? await prisma.position.findMany({
          where: { id: { in: dueRows.map((r) => r.positionId) } },
          include: { theme: true },
        })
      : [];
  for (const row of dueFullRows) positionsById.set(row.id, row);

  const items: SessionQueueEntry[] = queue.map((entry) => {
    const row = positionsById.get(entry.positionId);
    return {
      positionId: entry.positionId,
      kind: entry.kind,
      themeSlug: row?.theme.slug ?? "",
      title: row ? textsFor(row.texts, locale).title : "",
    };
  });

  return { items };
}

export interface ReviewSubmission {
  positionId: string;
  announceOk: boolean;
  abandoned: boolean;
  /** Nombre de coups perdants joués pendant la position (0 = aucun). */
  errors: number;
  tempoLost: boolean;
  hintRequested: boolean;
  moveDurationsMs: number[];
  durationMs: number;
  /** Coups joués, au format UCI. */
  moves: string[];
}

export interface ReviewResult {
  rating: ReviewGrade;
  due: Date;
  isNewPosition: boolean;
  xpGained: number;
  totalXp: number;
  level: number;
  streak: { current: number; best: number; freezes: number };
  newAchievements: string[];
}

/** POST /api/reviews (SPEC.md) : note la révision via `rateReview`, met à jour la carte FSRS du
 * joueur et journalise la révision. La note est calculée par le serveur, jamais déclarée par le
 * client (CLAUDE.md : « le serveur est la seule source de vérité »). XP et trophées sont du lot 6. */
export async function recordReview(userId: string, submission: ReviewSubmission): Promise<ReviewResult> {
  const position = await prisma.position.findUnique({ where: { id: submission.positionId } });
  if (!position || position.status !== "published") {
    throw new Error("not_found");
  }

  const existingCard = await prisma.card.findUnique({
    where: { userId_positionId: { userId, positionId: submission.positionId } },
  });
  const isNewPosition = !existingCard;

  await consumeUsage(userId, isNewPosition ? "newPositions" : "reviews");

  const outcome: ReviewOutcome = {
    blundered: submission.errors > 0,
    abandoned: submission.abandoned,
    announceOk: submission.announceOk,
    tempoLost: submission.tempoLost,
    hintRequested: submission.hintRequested,
    moveDurationsMs: submission.moveDurationsMs,
  };
  const rating = rateReview(outcome);

  const now = new Date();
  const baseCard = existingCard ? (existingCard.fsrsState as unknown as FsrsCardState) : newCardState(now);
  const { card: nextCard, due } = scheduleNextReview(baseCard, rating, now);

  await prisma.$transaction([
    prisma.card.upsert({
      where: { userId_positionId: { userId, positionId: submission.positionId } },
      create: {
        userId,
        positionId: submission.positionId,
        fsrsState: nextCard as unknown as Prisma.InputJsonValue,
        due,
      },
      update: { fsrsState: nextCard as unknown as Prisma.InputJsonValue, due },
    }),
    prisma.reviewLog.create({
      data: {
        userId,
        positionId: submission.positionId,
        rating,
        announceOk: submission.announceOk,
        errors: submission.errors,
        tempoLost: submission.tempoLost,
        durationMs: submission.durationMs,
        moves: submission.moves as unknown as Prisma.InputJsonValue,
      },
    }),
  ]);

  const gamification = await applyGamification({
    userId,
    positionId: submission.positionId,
    grade: rating,
    isNewPosition,
    announceOk: submission.announceOk,
    errors: submission.errors,
  });

  return { rating, due, isNewPosition, ...gamification };
}

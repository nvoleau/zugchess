/**
 * RushService (chantier 4, Zug Rush) : orchestre une partie chronométrée de 3 minutes — enchaîner
 * un maximum de finales, élimination après 3 erreurs, positions mélangées à difficulté croissante
 * (décisions produit actées). Jugement des coups délégué à `judgeService` (même juges exacts que
 * partout ailleurs) ; ce module ne fait que la mécanique du mode chrono (minuteur, tirage, score).
 *
 * Sans état mutable persisté entre deux coups (hors `RushRun.score`/`errors`) : comme
 * `SyzygyTrainer`/`POST /api/judge/syzygy` déjà en place, chaque appel reçoit la FEN "avant coup"
 * du client et la vérifie — même frontière de confiance que le reste du produit (CLAUDE.md : le
 * serveur reste juge du coup, mais ne rejoue pas l'historique complet depuis l'ouverture).
 */
import {
  RUSH_DURATION_MS,
  RUSH_HELD_TO_DRAW,
  RUSH_WIN_THRESHOLD,
  bestKpkReply,
  createSeededRandom,
  isRushOver,
  isRushTimeUp,
  kpkResult,
  nextRushTargetRating,
  pickSeeded,
  rushRemainingMs,
} from "@zugchess/core";
import { type ExpectedResult, type Side, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { consumeUsage } from "./entitlements";
import { attackerColorOf } from "@/components/play/chess-move-dests";
import { judgeKpkPositionMove, judgeLinePositionMove, judgeSyzygyPositionMove } from "./judgeService";
import { getPosition, type PositionDetail } from "./positionService";
import { markRushBlunderForReview } from "./schedulerService";
import { prisma } from "./prisma";

const ELIGIBLE_JUDGE_TYPES: Array<"kpk" | "syzygy" | "line"> = ["kpk", "syzygy", "line"];
const RATING_WINDOWS = [150, 400, Infinity];

type RushGoal = "win" | "draw";

function goalOf(position: PositionDetail): RushGoal {
  return position.expectedResult === "draw" ? "draw" : "win";
}

export class RushRunNotFoundError extends Error {
  constructor() {
    super("Partie Zug Rush introuvable ou déjà terminée.");
    this.name = "RushRunNotFoundError";
  }
}

/**
 * Tente de trouver une position jouable. `lastJudgeType` active l'alternance de types : on essaie
 * d'abord un type différent du dernier (ex. Syzygy après KPK) pour varier les finales, puis on se
 * rabat sur tous les types si le pool alternatif est vide.
 */
async function pickPosition(
  targetRating: number,
  excludeIds: string[],
  seed: string,
  locale: "fr" | "en",
  lastJudgeType?: string,
): Promise<PositionDetail> {
  // Working copy: grows as we discover unplayable positions.
  const skipped = new Set(excludeIds);

  // Exclude positions the player is expected to LOSE — e.g. "Lucena defender" where White always
  // wins regardless of Black's play. Only keep win-for-the-player or draw positions in Rush.
  const NOT_LOSING: Array<{ userSide: Side; expectedResult: ExpectedResult }> = [
    { userSide: "white", expectedResult: "black" },
    { userSide: "black", expectedResult: "white" },
  ];

  // Two tiers: first prefer a different judge type (variety), then fall back to all types.
  const alternatTypes = lastJudgeType
    ? ELIGIBLE_JUDGE_TYPES.filter((t) => t !== lastJudgeType)
    : [];
  const typeTiers: Array<Array<"kpk" | "syzygy" | "line">> =
    alternatTypes.length > 0
      ? [alternatTypes, ELIGIBLE_JUDGE_TYPES]
      : [ELIGIBLE_JUDGE_TYPES];

  for (const judgeTypes of typeTiers) {
    for (const window of RATING_WINDOWS) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const notIn = [...skipped];
        const baseWhere = {
          status: "published" as const,
          judgeType: { in: judgeTypes },
          id: { notIn },
          NOT: NOT_LOSING,
        };
        const where =
          window === Infinity
            ? baseWhere
            : { ...baseWhere, rating: { gte: targetRating - window, lte: targetRating + window } };

        const candidates = await prisma.position.findMany({ where, select: { id: true }, take: 60 });
        if (candidates.length === 0) break;

        const random = createSeededRandom(`${seed}:${notIn.length}:${window}:${attempt}`);
        const chosenId = pickSeeded(candidates, random).id;
        const position = await getPosition(chosenId, locale);

        if (!position) { skipped.add(chosenId); continue; }

        // Non-KPK positions where the initial turn doesn't match userSide can't be played in Rush
        // (KPK has a client-side auto-play for the first opponent move; Syzygy/Line do not).
        if (position.judgeType !== "kpk") {
          const fenTurn = position.fen.split(" ")[1];
          const playerTurn = position.userSide === "white" ? "w" : "b";
          if (fenTurn !== playerTurn) { skipped.add(chosenId); continue; }
        }

        // KPK defender: skip if the opponent's first auto-played move is a pawn promotion.
        // After promotion the position becomes K+Q vs K, which the KPK bitboard judge can't
        // handle (kpkResult only works for King+Pawn+King). This leaves the Rush stuck.
        if (position.judgeType === "kpk") {
          const fenTurn = position.fen.split(" ")[1];
          const playerTurn = position.userSide === "white" ? "w" : "b";
          if (fenTurn !== playerTurn) {
            const autoMove = bestKpkReply(position.fen);
            if (autoMove.promotion) { skipped.add(chosenId); continue; }
          }
        }

        // KPK defender: skip if theoretically lost — the bitboard says attacker wins with
        // optimal play, so every defender move is rejected (none maintain resultAfter === "draw").
        // Such positions are generated from randomWinningKpkFen() which only produces attacker-wins
        // FENs, making ALL their defender pairs unplayable.
        if (position.judgeType === "kpk") {
          const attackerColor = position.fen.split(" ")[0]!.includes("P") ? "white" : "black";
          const userIsDefender = position.userSide !== attackerColor;
          if (userIsDefender && kpkResult(position.fen) === "win") {
            skipped.add(chosenId); continue;
          }
        }

        return position;
      }
    }
    // First tier exhausted (no variety available) — continue to fallback tier.
  }

  throw new Error("Aucune position disponible pour Zug Rush.");
}

export interface RushStartResult {
  runId: string;
  position: PositionDetail;
  durationMs: number;
  remainingMs: number;
  score: number;
  errors: number;
}

/** POST /api/rush : démarre une partie — consomme le quota du jour (1/jour en gratuit, illimité en Premium). */
export async function startRun(userId: string, locale: "fr" | "en"): Promise<RushStartResult> {
  await consumeUsage(userId, "rushRuns");

  const seed = randomUUID();
  const position = await pickPosition(nextRushTargetRating(0), [], seed, locale);

  const run = await prisma.rushRun.create({
    data: { userId, mode: "threeMin", seed, status: "inProgress" },
  });

  return { runId: run.id, position, durationMs: RUSH_DURATION_MS, remainingMs: RUSH_DURATION_MS, score: 0, errors: 0 };
}

export interface RushMoveParams {
  positionId: string;
  fenBefore: string;
  uci: string;
  /** Uniquement pour `judgeType === "line"` : index de l'étape tentée dans la ligne de méthode. */
  stepIndex?: number;
  /** Uniquement pour une position "tenir la nulle" : nombre de coups déjà tenus avant celui-ci. */
  heldSoFar?: number;
  /** Nombre de coups corrects déjà joués sur cette position (pour le seuil `RUSH_WIN_THRESHOLD`). */
  movesSoFar?: number;
  /** Durées de réflexion cumulées pour cette position (y compris le coup courant), en ms. */
  moveDurationsMs: number[];
}

export interface RushMoveResult {
  /** false si la partie est terminée (temps écoulé ou déjà finalisée) — tout le reste est alors ignoré. */
  live: boolean;
  /** Le coup n'est pas une maladresse (reste en jeu sur cette position). */
  accepted: boolean;
  fenAfterReply?: string;
  reply?: string;
  hints?: string[];
  /** `judgeType === "line"` uniquement : index de la prochaine étape à envoyer sur le coup suivant. */
  nextStepIndex?: number;
  /** true si cette position vient de se conclure (réussie ou ratée) — `nextPosition` est alors fourni si la partie continue. */
  positionConcluded: boolean;
  correct?: boolean;
  score: number;
  errors: number;
  remainingMs: number;
  runOver: boolean;
  nextPosition?: PositionDetail;
}

async function finalizeRun(runId: string) {
  await prisma.rushRun.update({ where: { id: runId }, data: { status: "completed", endedAt: new Date() } });
}

/** POST /api/rush/[runId]/move : juge un coup et, le cas échéant, conclut la position en cours. */
export async function submitMove(userId: string, runId: string, locale: "fr" | "en", params: RushMoveParams): Promise<RushMoveResult> {
  const run = await prisma.rushRun.findUnique({ where: { id: runId } });
  if (!run || run.userId !== userId || run.status !== "inProgress") {
    throw new RushRunNotFoundError();
  }

  const now = new Date();
  if (isRushTimeUp(run.startedAt, now)) {
    await finalizeRun(runId);
    return { live: false, accepted: false, positionConcluded: false, score: run.score, errors: run.errors, remainingMs: 0, runOver: true };
  }

  const position = await getPosition(params.positionId, locale);
  if (!position) throw new Error("not_found");

  const goal = goalOf(position);
  const moveDurationsMs = params.moveDurationsMs;

  let blundered = false;
  let solved = false;
  let fenAfterReply: string | undefined;
  let reply: string | undefined;
  let hints: string[] | undefined;
  let nextStepIndex: number | undefined;

  if (position.judgeType === "kpk") {
    const result = judgeKpkPositionMove(params.fenBefore, params.uci);
    blundered = result.blundered;
    fenAfterReply = result.fenAfterReply;
    if (!blundered) {
      const role = attackerColorOf(position.fen) === position.userSide ? "attacker" : "defender";
      const terminal = result.gameOverReason != null || result.fenAfterReply === undefined;
      const thresholdReached = (params.movesSoFar ?? 0) + 1 >= RUSH_WIN_THRESHOLD;
      solved = role === "attacker"
        ? terminal || thresholdReached
        : terminal || (params.heldSoFar ?? 0) + 1 >= RUSH_HELD_TO_DRAW;
    }
  } else if (position.judgeType === "syzygy") {
    const result = await judgeSyzygyPositionMove(params.fenBefore, params.uci);
    blundered = result.blundered;
    fenAfterReply = result.fenAfterReply;
    reply = result.reply;
    hints = result.hints;
    if (!blundered) {
      const terminal = result.gameOverReason != null || result.reply === undefined;
      const thresholdReached = (params.movesSoFar ?? 0) + 1 >= RUSH_WIN_THRESHOLD;
      solved = goal === "win"
        ? terminal || thresholdReached
        : terminal || (params.heldSoFar ?? 0) + 1 >= RUSH_HELD_TO_DRAW;
    }
  } else if (position.judgeType === "line" && position.methodLine) {
    const stepIndex = params.stepIndex ?? 0;
    const from = params.uci.slice(0, 2);
    const to = params.uci.slice(2, 4);
    const promotion = params.uci.slice(4) || undefined;
    const result = judgeLinePositionMove(position.methodLine, stepIndex, { from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
    blundered = !result.correct;
    hints = result.hint ? [result.hint] : undefined;
    fenAfterReply = result.fenAfterAuto;
    nextStepIndex = result.nextStepIndex;
    solved = result.lineComplete;
  } else {
    throw new Error("unsupported_judge_type");
  }

  const remainingMs = rushRemainingMs(run.startedAt, now);

  if (!solved && !blundered) {
    // La position continue — rien à persister, le client rejoue sur la même position.
    return { live: true, accepted: true, fenAfterReply, reply, hints, nextStepIndex, positionConcluded: false, score: run.score, errors: run.errors, remainingMs, runOver: false };
  }

  // La position se conclut (réussie ou ratée) : on journalise et on passe à la suite.
  const correct = solved && !blundered;
  await prisma.rushAttempt.create({
    data: {
      runId,
      positionId: position.id,
      order: run.score + run.errors,
      correct,
      durationMs: moveDurationsMs.reduce((s, m) => s + m, 0),
      moveDurationsMs: moveDurationsMs as unknown as Prisma.InputJsonValue,
    },
  });

  // Erreur Rush → programmer la position en révision FSRS (note Again, pas de quota/XP).
  if (!correct) {
    await markRushBlunderForReview(userId, position.id);
  }

  const nextScore = correct ? run.score + 1 : run.score;
  const nextErrors = correct ? run.errors : run.errors + 1;

  if (isRushOver(nextErrors) || isRushTimeUp(run.startedAt, now)) {
    await prisma.rushRun.update({
      where: { id: runId },
      data: { score: nextScore, errors: nextErrors, status: "completed", endedAt: new Date() },
    });
    return { live: true, accepted: !blundered, fenAfterReply, reply, hints, positionConcluded: true, correct, score: nextScore, errors: nextErrors, remainingMs, runOver: true };
  }

  await prisma.rushRun.update({ where: { id: runId }, data: { score: nextScore, errors: nextErrors } });

  // Exclude ALL positions already attempted in this run (not just the current one) to avoid repeats.
  const attempted = await prisma.rushAttempt.findMany({ where: { runId }, select: { positionId: true } });
  const excludeIds = [...new Set([...attempted.map((a) => a.positionId), position.id])];
  const nextPosition = await pickPosition(nextRushTargetRating(nextScore), excludeIds, run.seed, locale, position.judgeType);

  return {
    live: true,
    accepted: !blundered,
    fenAfterReply,
    reply,
    hints,
    positionConcluded: true,
    correct,
    score: nextScore,
    errors: nextErrors,
    remainingMs,
    runOver: false,
    nextPosition,
  };
}

export interface RushRecord {
  best: number;
  playedToday: boolean;
}

export async function getRushPersonalRecord(userId: string): Promise<RushRecord> {
  const [best, latestRun] = await Promise.all([
    prisma.rushRun.aggregate({ where: { userId, status: "completed" }, _max: { score: true } }),
    prisma.rushRun.findFirst({ where: { userId }, orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
  ]);

  const playedToday = latestRun ? latestRun.startedAt.toDateString() === new Date().toDateString() : false;
  return { best: best._max.score ?? 0, playedToday };
}

export type RushPeriod = "day" | "week" | "all";

export interface RushLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
}

function periodStart(period: RushPeriod): Date | undefined {
  if (period === "all") return undefined;
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return weekAgo;
}

/** Meilleur score par joueur sur la période — exclut les profils privés et les comptes exclus anti-triche. */
export async function getRushLeaderboard(period: RushPeriod, limit = 20): Promise<RushLeaderboardEntry[]> {
  const since = periodStart(period);

  const grouped = await prisma.rushRun.groupBy({
    by: ["userId"],
    where: { status: "completed", ...(since ? { startedAt: { gte: since } } : {}) },
    _max: { score: true },
    orderBy: { _max: { score: "desc" } },
    take: limit * 2, // marge pour le filtre post-hoc sur le profil
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, publicProfile: true, excludedFromLeaderboards: false },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return grouped
    .filter((g) => userMap.has(g.userId))
    .slice(0, limit)
    .map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      name: userMap.get(g.userId)?.name ?? "—",
      avatar: userMap.get(g.userId)?.image ?? null,
      score: g._max.score ?? 0,
    }));
}

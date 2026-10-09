-- CreateEnum
CREATE TYPE "RatingSource" AS ENUM ('review');

-- CreateEnum
CREATE TYPE "AntiCheatKind" AS ENUM ('abnormal_speed', 'perfect_vs_tablebase', 'statistical_outlier');

-- CreateEnum
CREATE TYPE "AntiCheatStatus" AS ENUM ('open', 'cleared', 'confirmed');

-- CreateEnum
CREATE TYPE "RushMode" AS ENUM ('threeMin');

-- CreateEnum
CREATE TYPE "RushRunStatus" AS ENUM ('inProgress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "JudgeOutcomeDb" AS ENUM ('win', 'draw', 'loss');

-- CreateEnum
CREATE TYPE "LeagueDivision" AS ENUM ('pion', 'cavalier', 'fou', 'tour', 'dame', 'roi');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('pending', 'accepted', 'completed', 'expired');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "excludedFromLeaderboards" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DailyUsage" ADD COLUMN     "rushRuns" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PlayerRating" ADD COLUMN     "bestRating" DOUBLE PRECISION,
ADD COLUMN     "bestRatingAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayerFamilyRating" (
    "userId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "deviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "games" INTEGER NOT NULL DEFAULT 0,
    "bestRating" DOUBLE PRECISION,
    "bestRatingAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerFamilyRating_pkey" PRIMARY KEY ("userId","family")
);

-- CreateTable
CREATE TABLE "RatingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "family" TEXT,
    "source" "RatingSource" NOT NULL,
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "deviationAfter" DOUBLE PRECISION NOT NULL,
    "positionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntiCheatFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AntiCheatKind" NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "AntiCheatStatus" NOT NULL DEFAULT 'open',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AntiCheatFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "RushMode" NOT NULL DEFAULT 'threeMin',
    "status" "RushRunStatus" NOT NULL DEFAULT 'inProgress',
    "score" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "seed" TEXT NOT NULL,
    "suspiciousFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RushRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushAttempt" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "moveDurationsMs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RushAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallengeAttempt" (
    "id" TEXT NOT NULL,
    "dailyChallengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablebasePrecisionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "movesPlayed" INTEGER NOT NULL,
    "optimalMoves" INTEGER NOT NULL,
    "precisionPct" DOUBLE PRECISION NOT NULL,
    "outcome" "JudgeOutcomeDb" NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TablebasePrecisionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueProfile" (
    "userId" TEXT NOT NULL,
    "currentDivision" "LeagueDivision" NOT NULL DEFAULT 'pion',
    "bestDivision" "LeagueDivision" NOT NULL DEFAULT 'pion',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LeagueSeason" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "rolledOver" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueGroup" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "division" "LeagueDivision" NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "LeagueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "promoted" BOOLEAN,
    "relegated" BOOLEAN,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaguePointEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaguePointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("clubId","userId")
);

-- CreateTable
CREATE TABLE "FriendInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "FriendInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelRating" (
    "userId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "deviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "games" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelRating_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DuelChallenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "inviteToken" TEXT NOT NULL,
    "positionIds" JSONB NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DuelChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelResult" (
    "duelChallengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "accuracyPct" DOUBLE PRECISION NOT NULL,
    "totalDurationMs" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelResult_pkey" PRIMARY KEY ("duelChallengeId","userId")
);

-- CreateTable
CREATE TABLE "LegendaryChallenge" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "requiredLevel" INTEGER NOT NULL,
    "title" JSONB NOT NULL,

    CONSTRAINT "LegendaryChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLegendaryUnlock" (
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLegendaryUnlock_pkey" PRIMARY KEY ("userId","challengeId")
);

-- CreateIndex
CREATE INDEX "PlayerFamilyRating_family_rating_idx" ON "PlayerFamilyRating"("family", "rating");

-- CreateIndex
CREATE INDEX "RatingEvent_userId_family_createdAt_idx" ON "RatingEvent"("userId", "family", "createdAt");

-- CreateIndex
CREATE INDEX "AntiCheatFlag_userId_status_idx" ON "AntiCheatFlag"("userId", "status");

-- CreateIndex
CREATE INDEX "RushRun_userId_mode_score_idx" ON "RushRun"("userId", "mode", "score");

-- CreateIndex
CREATE INDEX "RushRun_mode_createdAt_score_idx" ON "RushRun"("mode", "createdAt", "score");

-- CreateIndex
CREATE INDEX "RushAttempt_runId_order_idx" ON "RushAttempt"("runId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- CreateIndex
CREATE INDEX "DailyChallengeAttempt_dailyChallengeId_success_durationMs_idx" ON "DailyChallengeAttempt"("dailyChallengeId", "success", "durationMs");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeAttempt_dailyChallengeId_userId_key" ON "DailyChallengeAttempt"("dailyChallengeId", "userId");

-- CreateIndex
CREATE INDEX "TablebasePrecisionAttempt_userId_createdAt_idx" ON "TablebasePrecisionAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TablebasePrecisionAttempt_positionId_precisionPct_idx" ON "TablebasePrecisionAttempt"("positionId", "precisionPct");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeason_weekStart_key" ON "LeagueSeason"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueGroup_seasonId_division_index_key" ON "LeagueGroup"("seasonId", "division", "index");

-- CreateIndex
CREATE INDEX "LeagueMembership_groupId_points_idx" ON "LeagueMembership"("groupId", "points");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_seasonId_userId_key" ON "LeagueMembership"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "LeaguePointEvent_userId_seasonId_createdAt_idx" ON "LeaguePointEvent"("userId", "seasonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "ClubMembership_userId_idx" ON "ClubMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendInvite_token_key" ON "FriendInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");

-- CreateIndex
CREATE UNIQUE INDEX "DuelChallenge_inviteToken_key" ON "DuelChallenge"("inviteToken");

-- AddForeignKey
ALTER TABLE "PlayerFamilyRating" ADD CONSTRAINT "PlayerFamilyRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingEvent" ADD CONSTRAINT "RatingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntiCheatFlag" ADD CONSTRAINT "AntiCheatFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushRun" ADD CONSTRAINT "RushRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushAttempt" ADD CONSTRAINT "RushAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RushRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeAttempt" ADD CONSTRAINT "DailyChallengeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablebasePrecisionAttempt" ADD CONSTRAINT "TablebasePrecisionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueProfile" ADD CONSTRAINT "LeagueProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueGroup" ADD CONSTRAINT "LeagueGroup_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeagueSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeagueSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LeagueGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaguePointEvent" ADD CONSTRAINT "LeaguePointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendInvite" ADD CONSTRAINT "FriendInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelRating" ADD CONSTRAINT "DuelRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelChallenge" ADD CONSTRAINT "DuelChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegendaryUnlock" ADD CONSTRAINT "UserLegendaryUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegendaryUnlock" ADD CONSTRAINT "UserLegendaryUnlock_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LegendaryChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;


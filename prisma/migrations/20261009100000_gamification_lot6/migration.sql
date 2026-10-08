-- Lot 6 — Gamification : PlayerRating, XpEvent, Streak, Achievement, UserAchievement

CREATE TABLE "PlayerRating" (
  "userId"     TEXT NOT NULL,
  "rating"     DOUBLE PRECISION NOT NULL DEFAULT 1500,
  "deviation"  DOUBLE PRECISION NOT NULL DEFAULT 350,
  "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
  "games"      INTEGER NOT NULL DEFAULT 0,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "PlayerRating"
  ADD CONSTRAINT "PlayerRating_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "XpEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "reason"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "XpEvent"
  ADD CONSTRAINT "XpEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

CREATE TABLE "Streak" (
  "userId"  TEXT NOT NULL,
  "current" INTEGER NOT NULL DEFAULT 0,
  "best"    INTEGER NOT NULL DEFAULT 0,
  "freezes" INTEGER NOT NULL DEFAULT 0,
  "lastDay" TEXT,
  CONSTRAINT "Streak_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "Streak"
  ADD CONSTRAINT "Streak_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Achievement" (
  "code"        TEXT NOT NULL,
  "name"        JSONB NOT NULL,
  "description" JSONB NOT NULL,
  "condition"   JSONB NOT NULL,
  "icon"        TEXT NOT NULL,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "UserAchievement" (
  "userId"     TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "code")
);

ALTER TABLE "UserAchievement"
  ADD CONSTRAINT "UserAchievement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAchievement"
  ADD CONSTRAINT "UserAchievement_code_fkey"
  FOREIGN KEY ("code") REFERENCES "Achievement"("code") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

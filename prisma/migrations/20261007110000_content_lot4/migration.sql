-- CreateEnum
CREATE TYPE "Side" AS ENUM ('white', 'black');

-- CreateEnum
CREATE TYPE "ExpectedResult" AS ENUM ('white', 'draw', 'black');

-- CreateEnum
CREATE TYPE "JudgeType" AS ENUM ('kpk', 'syzygy', 'stockfish', 'line');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "userSide" "Side" NOT NULL,
    "expectedResult" "ExpectedResult" NOT NULL,
    "judgeType" "JudgeType" NOT NULL,
    "lineMoves" JSONB,
    "texts" JSONB NOT NULL,
    "source" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "ratingDeviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "status" "PositionStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionLink" (
    "positionId" TEXT NOT NULL,
    "linkedId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "PositionLink_pkey" PRIMARY KEY ("positionId","linkedId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Lesson_themeId_idx" ON "Lesson"("themeId");

-- CreateIndex
CREATE INDEX "Position_themeId_idx" ON "Position"("themeId");

-- CreateIndex
CREATE INDEX "Position_status_idx" ON "Position"("status");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionLink" ADD CONSTRAINT "PositionLink_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionLink" ADD CONSTRAINT "PositionLink_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

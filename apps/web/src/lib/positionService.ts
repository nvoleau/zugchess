import type { MethodLine } from "@zugchess/core";
import { prisma } from "./prisma";

export interface PositionTexts {
  title: string;
  intro: string;
  goal: string;
}

/** Projette `Position.texts` (JSON `{ fr: {...}, en: {...} }`) sur la langue demandée, avec repli sur le français. */
function textsFor(texts: unknown, locale: "fr" | "en"): PositionTexts {
  const byLocale = texts as Record<string, PositionTexts | undefined>;
  return byLocale[locale] ?? byLocale.fr ?? { title: "", intro: "", goal: "" };
}

export interface PositionSummary {
  id: string;
  themeSlug: string;
  title: string;
  free: boolean;
}

export async function listPositions({
  theme,
  page = 1,
  pageSize = 20,
  locale,
}: {
  theme?: string;
  page?: number;
  pageSize?: number;
  locale: "fr" | "en";
}): Promise<{ items: PositionSummary[]; total: number; page: number; pageSize: number }> {
  const where = { status: "published" as const, ...(theme ? { theme: { slug: theme } } : {}) };

  const [rows, total] = await Promise.all([
    prisma.position.findMany({
      where,
      include: { theme: true },
      orderBy: [{ theme: { order: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.position.count({ where }),
  ]);

  return {
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      id: row.id,
      themeSlug: row.theme.slug,
      title: textsFor(row.texts, locale).title,
      free: row.free,
    })),
  };
}

export interface PositionDetail {
  id: string;
  themeSlug: string;
  fen: string;
  userSide: "white" | "black";
  expectedResult: "white" | "draw" | "black";
  judgeType: "kpk" | "syzygy" | "stockfish" | "line";
  free: boolean;
  texts: PositionTexts;
  /** Reconstruite depuis `fen` + `userSide` + `lineMoves`, prête pour `judgeMethodLineMove` — uniquement si `judgeType === "line"`. */
  methodLine: MethodLine | null;
}

export async function getPosition(id: string, locale: "fr" | "en"): Promise<PositionDetail | null> {
  const row = await prisma.position.findUnique({ where: { id }, include: { theme: true } });
  if (!row || row.status !== "published") return null;

  return {
    id: row.id,
    themeSlug: row.theme.slug,
    fen: row.fen,
    userSide: row.userSide,
    expectedResult: row.expectedResult,
    judgeType: row.judgeType,
    free: row.free,
    texts: textsFor(row.texts, locale),
    methodLine:
      row.judgeType === "line"
        ? { fen: row.fen, playerSide: row.userSide, steps: row.lineMoves as unknown as MethodLine["steps"] }
        : null,
  };
}

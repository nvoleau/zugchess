import type { MethodLine } from "@zugchess/core";
import { prisma } from "./prisma";

export interface PositionTexts {
  title: string;
  intro: string;
  goal: string;
}

/** Projette `Position.texts` (JSON `{ fr: {...}, en: {...} }`) sur la langue demandée, avec repli sur le français. */
export function textsFor(texts: unknown, locale: "fr" | "en"): PositionTexts {
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

// ---------------------------------------------------------------------------
// Page Leçons : toutes les positions publiées + niveau de maîtrise FSRS
// ---------------------------------------------------------------------------

export interface PositionMasteryItem {
  id: string;
  title: string;
  mastery: "new" | "learning" | "familiar" | "mastered";
}

export interface ThemeLessons {
  id: string;
  slug: string;
  title: string;
  order: number;
  positions: PositionMasteryItem[];
}

function masteryFromStability(stability: number | undefined): "new" | "learning" | "familiar" | "mastered" {
  if (!stability) return "learning";
  if (stability < 7) return "learning";
  if (stability < 30) return "familiar";
  return "mastered";
}

// ---------------------------------------------------------------------------
// Vue par thème : stats agrégées (sans charger toutes les positions)
// ---------------------------------------------------------------------------

export interface ThemeStat {
  id: string;
  slug: string;
  title: string;
  family: string;
  total: number;
  masteredCount: number;
  familiarCount: number;
  learningCount: number;
  newCount: number;
}

export async function listThemeStats(userId: string, locale: "fr" | "en"): Promise<ThemeStat[]> {
  const themes = await prisma.theme.findMany({
    where: { positions: { some: { status: "published" } } },
    include: {
      positions: {
        where: { status: "published" },
        select: { id: true, cards: { where: { userId }, select: { fsrsState: true } } },
      },
    },
    orderBy: { order: "asc" },
  });

  return themes.map((theme) => {
    const titleJson = theme.title as Record<string, string>;
    let mastered = 0, familiar = 0, learning = 0, newCount = 0;
    for (const pos of theme.positions) {
      const card = pos.cards[0];
      const mastery = card
        ? masteryFromStability((card.fsrsState as { stability?: number } | null)?.stability)
        : "new";
      if (mastery === "mastered") mastered++;
      else if (mastery === "familiar") familiar++;
      else if (mastery === "learning") learning++;
      else newCount++;
    }
    return {
      id: theme.id,
      slug: theme.slug,
      title: titleJson[locale] ?? titleJson.fr ?? theme.slug,
      family: (theme.family as string) ?? "",
      total: theme.positions.length,
      masteredCount: mastered,
      familiarCount: familiar,
      learningCount: learning,
      newCount,
    };
  });
}

export async function listPositionsForTheme(
  themeSlug: string,
  userId: string,
  locale: "fr" | "en",
  skip = 0,
  take = 24,
): Promise<{ positions: PositionMasteryItem[]; total: number }> {
  const where = { status: "published" as const, theme: { slug: themeSlug } };
  const [rows, total] = await Promise.all([
    prisma.position.findMany({
      where,
      include: { cards: { where: { userId }, select: { fsrsState: true } } },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    prisma.position.count({ where }),
  ]);

  return {
    total,
    positions: rows.map((row) => {
      const card = row.cards[0];
      const mastery = card
        ? masteryFromStability((card.fsrsState as { stability?: number } | null)?.stability)
        : "new";
      return { id: row.id, title: textsFor(row.texts, locale).title, mastery };
    }),
  };
}

/**
 * Retourne tous les thèmes ayant au moins une position publiée, avec pour chaque position
 * son niveau de maîtrise FSRS (stability) pour l'utilisateur donné.
 */
export async function listThemesWithPositions(userId: string, locale: "fr" | "en"): Promise<ThemeLessons[]> {
  const rows = await prisma.position.findMany({
    where: { status: "published" },
    include: {
      theme: true,
      cards: { where: { userId }, select: { fsrsState: true } },
    },
    orderBy: [{ theme: { order: "asc" } }, { createdAt: "asc" }],
  });

  const themeMap = new Map<string, ThemeLessons>();

  for (const row of rows) {
    if (!themeMap.has(row.themeId)) {
      const titleJson = row.theme.title as Record<string, string>;
      themeMap.set(row.themeId, {
        id: row.theme.id,
        slug: row.theme.slug,
        title: titleJson[locale] ?? titleJson.fr ?? row.theme.slug,
        order: row.theme.order,
        positions: [],
      });
    }

    const card = row.cards[0];
    const mastery = card
      ? masteryFromStability((card.fsrsState as { stability?: number } | null)?.stability)
      : "new";

    themeMap.get(row.themeId)!.positions.push({
      id: row.id,
      title: textsFor(row.texts, locale).title,
      mastery,
    });
  }

  return Array.from(themeMap.values()).sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------

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

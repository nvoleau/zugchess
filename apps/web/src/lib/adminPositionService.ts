import type { MethodLineStep } from "@zugchess/core";
import { Chess } from "chess.js";
import { Prisma, type ExpectedResult, type JudgeType, type PositionStatus, type Side } from "@prisma/client";
import { prisma } from "./prisma";
import { textsFor, type PositionTexts } from "./positionService";

export class InvalidFenError extends Error {}
export class InvalidLineMoveError extends Error {}

function assertValidFen(fen: string): void {
  try {
    new Chess(fen);
  } catch {
    throw new InvalidFenError(`FEN invalide : "${fen}"`);
  }
}

/**
 * Parse le format texte d'édition des lignes de méthode (une ligne par coup :
 * `SAN | commentaire fr | commentaire en`), rejoué avec chess.js depuis la FEN pour garantir la
 * légalité — même principe que `buildLineSteps` de `prisma/seed.ts`, pour l'admin interactif.
 */
function parseLineMovesText(fen: string, text: string): MethodLineStep[] {
  const chess = new Chess(fen);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    const [san, fr, en] = line.split("|").map((part) => part.trim());
    if (!san) {
      throw new InvalidLineMoveError(`Ligne mal formée : "${line}"`);
    }
    const move = chess.move(san);
    if (!move) {
      throw new InvalidLineMoveError(`Coup illégal "${san}" depuis ${chess.fen()}`);
    }
    return {
      move: { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion as "q" | "r" | "b" | "n" } : {}) },
      comment: { fr: fr ?? "", en: en ?? "" },
    };
  });
}

/** Inverse de `parseLineMovesText`, pour pré-remplir le formulaire d'édition. */
function lineStepsToText(fen: string, steps: MethodLineStep[]): string {
  const chess = new Chess(fen);
  return steps
    .map((step) => {
      const move = chess.move({ from: step.move.from, to: step.move.to, promotion: step.move.promotion });
      const san = move?.san ?? `${step.move.from}${step.move.to}`;
      return `${san} | ${step.comment.fr} | ${step.comment.en}`;
    })
    .join("\n");
}

export interface AdminPositionSummary {
  id: string;
  themeSlug: string;
  title: string;
  judgeType: JudgeType;
  status: PositionStatus;
  free: boolean;
}

export async function listPositionsForAdmin({
  status,
  themeSlug,
  page = 1,
  pageSize = 20,
}: {
  status?: PositionStatus;
  themeSlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminPositionSummary[]; total: number; page: number; pageSize: number }> {
  const where = {
    ...(status ? { status } : {}),
    ...(themeSlug ? { theme: { slug: themeSlug } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.position.findMany({
      where,
      include: { theme: true },
      orderBy: [{ theme: { order: "asc" } }, { createdAt: "desc" }],
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
      title: textsFor(row.texts, "fr").title,
      judgeType: row.judgeType,
      status: row.status,
      free: row.free,
    })),
  };
}

export async function listThemesForAdmin() {
  return prisma.theme.findMany({ orderBy: [{ family: "asc" }, { order: "asc" }] });
}

export interface AdminPositionDetail {
  id: string;
  themeId: string;
  fen: string;
  userSide: Side;
  expectedResult: ExpectedResult;
  judgeType: JudgeType;
  status: PositionStatus;
  free: boolean;
  source: string | null;
  rating: number;
  ratingDeviation: number;
  texts: { fr: PositionTexts; en: PositionTexts };
  /** Vide si `judgeType !== "line"`. */
  lineMovesText: string;
}

export async function getPositionForAdmin(id: string): Promise<AdminPositionDetail | null> {
  const row = await prisma.position.findUnique({ where: { id } });
  if (!row) return null;

  return {
    id: row.id,
    themeId: row.themeId,
    fen: row.fen,
    userSide: row.userSide,
    expectedResult: row.expectedResult,
    judgeType: row.judgeType,
    status: row.status,
    free: row.free,
    source: row.source,
    rating: row.rating,
    ratingDeviation: row.ratingDeviation,
    texts: { fr: textsFor(row.texts, "fr"), en: textsFor(row.texts, "en") },
    lineMovesText:
      row.judgeType === "line" && row.lineMoves
        ? lineStepsToText(row.fen, row.lineMoves as unknown as MethodLineStep[])
        : "",
  };
}

export interface PositionInput {
  themeId: string;
  fen: string;
  userSide: Side;
  expectedResult: ExpectedResult;
  judgeType: JudgeType;
  /** Requis si `judgeType === "line"` — ignoré sinon. */
  lineMovesText?: string;
  texts: { fr: PositionTexts; en: PositionTexts };
  source?: string;
  rating: number;
  ratingDeviation: number;
  free: boolean;
}

function toPersistedFields(input: PositionInput) {
  assertValidFen(input.fen);
  const lineMoves = input.judgeType === "line" ? parseLineMovesText(input.fen, input.lineMovesText ?? "") : undefined;

  return {
    themeId: input.themeId,
    fen: input.fen,
    userSide: input.userSide,
    expectedResult: input.expectedResult,
    judgeType: input.judgeType,
    lineMoves: lineMoves as unknown as Prisma.InputJsonValue | undefined,
    texts: input.texts as unknown as Prisma.InputJsonValue,
    source: input.source,
    rating: input.rating,
    ratingDeviation: input.ratingDeviation,
    free: input.free,
  };
}

/** Crée une position en brouillon (SPEC.md : « Création, validation, publication »). */
export async function createPosition(input: PositionInput): Promise<string> {
  const row = await prisma.position.create({ data: { ...toPersistedFields(input), status: "draft" } });
  return row.id;
}

export async function updatePosition(id: string, input: PositionInput): Promise<void> {
  await prisma.position.update({ where: { id }, data: toPersistedFields(input) });
}

export async function setPositionStatus(id: string, status: PositionStatus): Promise<void> {
  await prisma.position.update({ where: { id }, data: { status } });
}

/** Lit le `FormData` du formulaire admin (`PositionForm`) vers `PositionInput`, pour les server actions des pages `admin/positions/*`. */
export function parsePositionFormData(formData: FormData): PositionInput {
  const text = (key: string) => String(formData.get(key) ?? "");

  return {
    themeId: text("themeId"),
    fen: text("fen"),
    userSide: text("userSide") as Side,
    expectedResult: text("expectedResult") as ExpectedResult,
    judgeType: text("judgeType") as JudgeType,
    lineMovesText: text("lineMovesText"),
    texts: {
      fr: { title: text("titleFr"), intro: text("introFr"), goal: text("goalFr") },
      en: { title: text("titleEn"), intro: text("introEn"), goal: text("goalEn") },
    },
    source: text("source") || undefined,
    rating: Number(formData.get("rating") ?? 1500),
    ratingDeviation: Number(formData.get("ratingDeviation") ?? 350),
    free: formData.get("free") === "on",
  };
}

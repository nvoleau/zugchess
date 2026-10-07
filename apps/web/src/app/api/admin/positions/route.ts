import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, requireAdminApi } from "@/lib/adminAuth";
import { createPosition, InvalidFenError, InvalidLineMoveError, listPositionsForAdmin } from "@/lib/adminPositionService";

const textsSchema = z.object({ title: z.string(), intro: z.string(), goal: z.string() });

const positionInputSchema = z.object({
  themeId: z.string().min(1),
  fen: z.string().min(1),
  userSide: z.enum(["white", "black"]),
  expectedResult: z.enum(["white", "draw", "black"]),
  judgeType: z.enum(["kpk", "syzygy", "stockfish", "line"]),
  lineMovesText: z.string().optional(),
  texts: z.object({ fr: textsSchema, en: textsSchema }),
  source: z.string().optional(),
  rating: z.number(),
  ratingDeviation: z.number(),
  free: z.boolean(),
});

/** GET /api/admin/positions?status=&theme=&page= (SPEC.md, back-office de relecture). */
export async function GET(request: Request) {
  try {
    await requireAdminApi();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const themeSlug = url.searchParams.get("theme") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

  const result = await listPositionsForAdmin({
    status: status === "draft" || status === "published" || status === "archived" ? status : undefined,
    themeSlug,
    page,
  });
  return NextResponse.json(result);
}

/** POST /api/admin/positions (SPEC.md : « Création, validation, publication (rôle admin) »). */
export async function POST(request: Request) {
  try {
    await requireAdminApi();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const parsed = positionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const id = await createPosition(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidFenError) {
      return NextResponse.json({ error: "invalid_fen" }, { status: 400 });
    }
    if (error instanceof InvalidLineMoveError) {
      return NextResponse.json({ error: "invalid_line_move", detail: error.message }, { status: 400 });
    }
    throw error;
  }
}

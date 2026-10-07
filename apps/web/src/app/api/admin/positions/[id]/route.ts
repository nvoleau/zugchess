import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, requireAdminApi } from "@/lib/adminAuth";
import {
  getPositionForAdmin,
  InvalidFenError,
  InvalidLineMoveError,
  setPositionStatus,
  updatePosition,
} from "@/lib/adminPositionService";

const textsSchema = z.object({ title: z.string(), intro: z.string(), goal: z.string() });

const positionUpdateSchema = z.object({
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
  status: z.enum(["draft", "published", "archived"]).optional(),
});

/** GET /api/admin/positions/:id (back-office) : détail, tous statuts. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const detail = await getPositionForAdmin(id);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

/** PATCH /api/admin/positions/:id (SPEC.md : validation, publication). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const parsed = positionUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const { status, ...fields } = parsed.data;
    await updatePosition(id, fields);
    if (status) {
      await setPositionStatus(id, status);
    }
    const detail = await getPositionForAdmin(id);
    return NextResponse.json(detail);
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

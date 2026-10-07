import { QuotaExceededError } from "@zugchess/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { recordReview } from "@/lib/schedulerService";

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const bodySchema = z.object({
  positionId: z.string().min(1),
  announceOk: z.boolean(),
  abandoned: z.boolean(),
  errors: z.number().int().min(0),
  tempoLost: z.boolean(),
  hintRequested: z.boolean(),
  moveDurationsMs: z.array(z.number().int().min(0)),
  durationMs: z.number().int().min(0),
  moves: z.array(z.string().regex(UCI_PATTERN)),
});

/**
 * POST /api/reviews (SPEC.md) : fin de position — note FSRS calculée côté serveur, nouvelle
 * échéance de la carte, journalisation. Ne renvoie pas encore XP/trophées (lot 6).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await recordReview(session.user.id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: "quota_exceeded", kind: error.kind }, { status: 429 });
    }
    if (error instanceof Error && error.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}

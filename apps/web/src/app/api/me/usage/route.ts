import { QuotaExceededError } from "@zugchess/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { consumeUsage } from "@/lib/entitlements";

const bodySchema = z.object({
  kind: z.enum(["newPositions", "reviews", "explanations"]),
});

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
    const entitlements = await consumeUsage(session.user.id, parsed.data.kind);
    return NextResponse.json(entitlements);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: "quota_exceeded", kind: error.kind }, { status: 429 });
    }
    throw error;
  }
}

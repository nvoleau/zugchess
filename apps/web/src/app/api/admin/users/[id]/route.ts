import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, requireAdminApi } from "@/lib/adminAuth";
import { getUserDetail, updateUserSubscription } from "@/lib/adminUserService";

const subscriptionUpdateSchema = z.object({
  plan: z.enum(["free", "premium"]).optional(),
  status: z.enum(["active", "canceled", "past_due", "trialing"]).optional(),
  billingPeriod: z.enum(["monthly", "yearly"]).nullable().optional(),
  founderDiscount: z.boolean().optional(),
});

/** GET /api/admin/users/:id (back-office) : détail d'un compte. */
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
  const detail = await getUserDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

/** PATCH /api/admin/users/:id (back-office) : override manuel de l'abonnement, sans Stripe. */
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
  const parsed = subscriptionUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await updateUserSubscription(id, parsed.data);
  const detail = await getUserDetail(id);
  return NextResponse.json(detail);
}

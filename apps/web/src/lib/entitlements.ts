import {
  assertCanConsume,
  getEntitlements,
  getUsageDayKey,
  usageDayKeyToDate,
  type Entitlements,
  type UsageKind,
} from "@zugchess/core";
import { prisma } from "./prisma";

async function getPlanAndDayKey(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  return {
    plan: subscription?.plan ?? "free",
    dayKey: getUsageDayKey(new Date(), user.timezone),
  } as const;
}

export async function getEntitlementsForUser(userId: string): Promise<Entitlements> {
  const { plan, dayKey } = await getPlanAndDayKey(userId);
  const usageRow = await prisma.dailyUsage.findUnique({
    where: { userId_day: { userId, day: usageDayKeyToDate(dayKey) } },
  });

  return getEntitlements(plan, {
    newPositions: usageRow?.newPositions ?? 0,
    reviews: usageRow?.reviews ?? 0,
    explanations: usageRow?.explanations ?? 0,
  });
}

/** Vérifie le quota puis incrémente le compteur du jour. Lève `QuotaExceededError` si dépassé. */
export async function consumeUsage(userId: string, kind: UsageKind): Promise<Entitlements> {
  const { plan, dayKey } = await getPlanAndDayKey(userId);
  const day = usageDayKeyToDate(dayKey);

  const usageRow = await prisma.dailyUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day },
    update: {},
  });

  assertCanConsume(
    plan,
    {
      newPositions: usageRow.newPositions,
      reviews: usageRow.reviews,
      explanations: usageRow.explanations,
    },
    kind,
  );

  const updated = await prisma.dailyUsage.update({
    where: { userId_day: { userId, day } },
    data: { [kind]: { increment: 1 } },
  });

  return getEntitlements(plan, {
    newPositions: updated.newPositions,
    reviews: updated.reviews,
    explanations: updated.explanations,
  });
}

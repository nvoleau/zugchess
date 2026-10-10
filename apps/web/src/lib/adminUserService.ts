import { getUsageDayKey, usageDayKeyToDate } from "@zugchess/core";
import type { BillingPeriod, Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  plan: Plan;
  status: SubscriptionStatus;
  founder: boolean;
}

/** Liste paginée des comptes, pour `/api/admin/users` et la page `admin/users`. */
export async function listUsers({
  query,
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminUserSummary[]; total: number; page: number; pageSize: number }> {
  const where = query
    ? { OR: [
        { email: { contains: query, mode: "insensitive" as const } },
        { name:  { contains: query, mode: "insensitive" as const } },
      ]}
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt,
      plan: row.subscription?.plan ?? "free",
      status: row.subscription?.status ?? "active",
      founder: row.founder,
    })),
  };
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  founder: boolean;
  role: "player" | "admin";
  subscription: {
    plan: Plan;
    status: SubscriptionStatus;
    billingPeriod: BillingPeriod | null;
    founderDiscount: boolean;
  } | null;
  settings: { newPerDay: number; reviewsPerDay: number } | null;
  usageToday: { newPositions: number; reviews: number; explanations: number };
  cardsCount: number;
  reviewLogsCount: number;
}

/** Détail d'un compte, pour `/api/admin/users/:id` et la page `admin/users/[id]`. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true, settings: true },
  });
  if (!row) return null;

  const dayKey = getUsageDayKey(new Date(), row.timezone);
  const [usageRow, cardsCount, reviewLogsCount] = await Promise.all([
    prisma.dailyUsage.findUnique({ where: { userId_day: { userId, day: usageDayKeyToDate(dayKey) } } }),
    prisma.card.count({ where: { userId } }),
    prisma.reviewLog.count({ where: { userId } }),
  ]);

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt,
    founder: row.founder,
    role: row.role,
    subscription: row.subscription
      ? {
          plan: row.subscription.plan,
          status: row.subscription.status,
          billingPeriod: row.subscription.billingPeriod,
          founderDiscount: row.subscription.founderDiscount,
        }
      : null,
    settings: row.settings ? { newPerDay: row.settings.newPerDay, reviewsPerDay: row.settings.reviewsPerDay } : null,
    usageToday: {
      newPositions: usageRow?.newPositions ?? 0,
      reviews: usageRow?.reviews ?? 0,
      explanations: usageRow?.explanations ?? 0,
    },
    cardsCount,
    reviewLogsCount,
  };
}

export interface SubscriptionUpdate {
  plan?: Plan;
  status?: SubscriptionStatus;
  billingPeriod?: BillingPeriod | null;
  founderDiscount?: boolean;
}

/** Override manuel de l'abonnement (SPEC.md : hors du flux Stripe), pour un support client direct. */
export async function updateUserSubscription(userId: string, update: SubscriptionUpdate): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...update },
    update,
  });
}

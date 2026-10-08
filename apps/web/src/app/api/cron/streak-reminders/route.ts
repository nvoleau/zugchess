/**
 * POST /api/cron/streak-reminders
 *
 * Cron Vercel à déclencher à 20:00 UTC chaque jour.
 * Trouve les joueurs avec une série active qui n'ont pas encore joué aujourd'hui
 * et leur envoie un rappel par e-mail (si emailStreakReminder = true).
 *
 * Authentification : header `Authorization: Bearer <CRON_SECRET>`.
 * Configurer CRON_SECRET dans les variables d'environnement Vercel.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStreakReminderEmail } from "@/lib/sendStreakReminderEmail";

export const runtime = "nodejs";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const today = todayUTC();

  // Joueurs avec série active et rappel activé.
  const candidates = await prisma.streak.findMany({
    where: {
      current: { gt: 0 },
      // Si lastDay === today, ils ont déjà joué → pas de rappel nécessaire.
      NOT: { lastDay: today },
      user: {
        settings: { emailStreakReminder: true },
        email: { not: null },
      },
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          locale: true,
        },
      },
    },
    take: 500, // garde-fou sur le volume
  });

  let sent = 0;
  for (const row of candidates) {
    const email = row.user.email;
    if (!email) continue;
    const locale = (row.user.locale === "en" ? "en" : "fr") as "fr" | "en";
    await sendStreakReminderEmail({
      to: email,
      name: row.user.name ?? email,
      streak: row.current,
      locale,
    });
    sent++;
  }

  return NextResponse.json({ sent, total: candidates.length });
}

/**
 * Envoie un rappel de série quotidien via Resend.
 * Si RESEND_API_KEY est absent, journalise uniquement (dev sans compte Resend).
 */
export async function sendStreakReminderEmail(params: {
  to: string;
  name: string;
  streak: number;
  locale: "fr" | "en";
}): Promise<void> {
  const { to, name, streak, locale } = params;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ZugChess <noreply@zugchess.app>";
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://zugchess.app";

  const subject =
    locale === "en"
      ? `Your ${streak}-day streak needs you today!`
      : `Votre série de ${streak} jours vous attend !`;

  const html =
    locale === "en"
      ? `<p>Hi ${name},</p>
<p>You're on a <strong>${streak}-day streak</strong> — don't break it today!</p>
<p><a href="${appUrl}/en/app">Play your daily session →</a></p>
<p style="font-size:12px;color:#888">To stop these reminders, turn them off in your settings.</p>`
      : `<p>Bonjour ${name},</p>
<p>Vous êtes sur une <strong>série de ${streak} jours</strong> — ne la brisez pas aujourd'hui !</p>
<p><a href="${appUrl}/fr/app">Jouer ma séance du jour →</a></p>
<p style="font-size:12px;color:#888">Pour arrêter ces rappels, désactivez-les dans vos réglages.</p>`;

  if (!apiKey) {
    console.log(`[ZugChess] Rappel série pour ${to} (streak=${streak}) : ${appUrl}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Échec rappel série pour ${to} (${response.status}): ${body}`);
    // On ne throw pas — un échec d'e-mail ne doit pas bloquer la tâche cron.
  }
}

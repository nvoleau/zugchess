import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { getTodaySession } from "@/lib/schedulerService";
import { getPlayerStats } from "@/lib/statsService";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatItem } from "@/components/ui/stat-item";
import { btnClass } from "@/components/ui/button";

// Dépend de la session (cookies) et des quotas du jour : jamais mis en cache statique.
export const dynamic = "force-dynamic";

function formatCount(value: number, unlimited: string): string {
  return Number.isFinite(value) ? String(value) : unlimited;
}

export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user; // garde centralisée dans app/layout.tsx

  const t = await getTranslations("App.Home");
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const [entitlements, todaySession, stats] = await Promise.all([
    getEntitlementsForUser(user.id as string),
    getTodaySession(user.id as string, localeTyped),
    getPlayerStats(user.id as string, localeTyped),
  ]);

  const dueCount = todaySession.items.filter((i) => i.kind === "due").length;
  const newCount = todaySession.items.filter((i) => i.kind === "new").length;
  const hasSession = todaySession.items.length > 0;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: `/${locale}` });
  }

  return (
    <div className="flex flex-col gap-10">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="kicker" className="mb-3 block">
            {t("greeting", { name: user.name ?? user.email ?? "" })}
          </Badge>
          <h1 className="font-brandSerif text-4xl leading-tight tracking-tight sm:text-5xl">
            {t("titleLine1")}{" "}
            <em className="not-italic text-brand-gold">{t("titleEm")}</em>
          </h1>
        </div>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="mt-1 text-sm text-brand-muted transition-colors hover:text-brand-cream"
          >
            {t("signOut")}
          </button>
        </form>
      </div>

      {/* CTA séance ou état vide */}
      {hasSession ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2.5">
            {dueCount > 0 && (
              <Badge variant="pill">{t("dueCount", { count: dueCount })}</Badge>
            )}
            {newCount > 0 && (
              <span className="rounded-full bg-white/[0.06] px-3 py-1 font-brandMono text-sm text-brand-mutedLight">
                {t("newCount", { count: newCount })}
              </span>
            )}
          </div>
          <Link href="/app/play" className={btnClass("primary", "lg", "w-fit")}>
            {t("cta")} →
          </Link>
        </div>
      ) : (
        <Card className="max-w-md">
          <p className="font-brandSerif text-xl text-brand-cream">{t("allDoneTitle")}</p>
          <p className="mt-2 text-sm text-brand-muted">{t("allDoneBody")}</p>
        </Card>
      )}

      {/* Quotas du jour */}
      <Card className="max-w-sm">
        <p className="mb-1 font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
          {t("quotasTitle")}
        </p>
        <StatItem
          label={t("newPositions")}
          value={formatCount(entitlements.remaining.newPositions, t("unlimited"))}
        />
        <StatItem
          label={t("reviews")}
          value={formatCount(entitlements.remaining.reviews, t("unlimited"))}
        />
        <StatItem
          label={t("explanations")}
          value={formatCount(entitlements.remaining.explanations, t("unlimited"))}
        />
      </Card>

      {/* Stats joueur */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex flex-col gap-0.5">
          <span className="font-brandMono text-xl text-brand-cream">{stats.rating}</span>
          <span className="text-xs text-brand-muted">{t("statsElo")}</span>
        </Card>
        <Card className="flex flex-col gap-0.5">
          <span className="font-brandMono text-xl text-brand-gold">
            {stats.totalXp} <span className="text-sm">XP</span>
          </span>
          <span className="text-xs text-brand-muted">{t("statsLevel", { level: stats.level })}</span>
        </Card>
        <Card className="flex flex-col gap-0.5">
          <span className="font-brandMono text-xl text-brand-cream">{stats.streak.current}</span>
          <span className="text-xs text-brand-muted">{t("statsStreak")}</span>
        </Card>
        <Card className="flex flex-col gap-0.5">
          <span className="font-brandMono text-xl text-brand-cream">{stats.streak.best}</span>
          <span className="text-xs text-brand-muted">{t("statsStreakBest")}</span>
        </Card>
      </div>

      {/* Jeu libre */}
      <Link href="/app/free-play" className={btnClass("ghost", "sm", "w-fit pl-0")}>
        {t("freePlayCta")} →
      </Link>
    </div>
  );
}

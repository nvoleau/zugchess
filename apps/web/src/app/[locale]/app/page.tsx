import { xpForLevel } from "@zugchess/core";
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
import { RatingCurve } from "@/components/rating/rating-curve";

export const dynamic = "force-dynamic";

function formatCount(value: number, unlimited: string): string {
  return Number.isFinite(value) ? String(value) : unlimited;
}

export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const t = await getTranslations("App.Home");
  const tFamily = await getTranslations("App.Families");
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const [entitlements, todaySession, stats] = await Promise.all([
    getEntitlementsForUser(user.id as string),
    getTodaySession(user.id as string, localeTyped),
    getPlayerStats(user.id as string, localeTyped),
  ]);

  const dueCount = todaySession.items.filter((i) => i.kind === "due").length;
  const newCount = todaySession.items.filter((i) => i.kind === "new").length;
  const hasSession = todaySession.items.length > 0;

  const xpCurrentLevel = xpForLevel(stats.level);
  const xpNextLevel = xpForLevel(stats.level + 1);
  const xpInLevel = stats.totalXp - xpCurrentLevel;
  const xpRange = xpNextLevel - xpCurrentLevel;
  const xpProgress = xpRange > 0 ? Math.min(xpInLevel / xpRange, 1) : 0;
  const xpToNext = xpNextLevel - stats.totalXp;

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

      {/* Stats joueur */}
      <div className="flex flex-col gap-3 max-w-sm">

        {/* Série — mise en avant */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-amber-400/60">
            {t("statsStreak")}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <span className="font-brandMono text-6xl leading-none text-amber-400">
              {stats.streak.current}
            </span>
            {stats.streak.best > 0 && (
              <span className="font-brandMono text-xs text-brand-muted pb-1">
                {t("statsStreakBest")} : {stats.streak.best}
              </span>
            )}
          </div>
        </div>

        {/* Niveau + barre XP */}
        <div className="rounded-xl border border-white/[0.06] bg-brand-panel p-5">
          <div className="flex items-center justify-between">
            <p className="font-brandMono text-sm font-medium text-brand-cream">
              {t("statsLevel", { level: stats.level })}
            </p>
            <p className="font-brandMono text-xs text-brand-muted">
              {t("statsXpProgress", { current: xpInLevel, range: xpRange })}
            </p>
          </div>
          <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-brand-gold transition-all duration-700"
              style={{ width: `${Math.max(xpProgress * 100, 2)}%` }}
            />
          </div>
          <p className="mt-2 font-brandMono text-[10px] text-brand-muted">
            {t("statsXpToNext", { xp: xpToNext, next: stats.level + 1 })}
          </p>

          {/* Guide XP */}
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
              {t("xpGuideTitle")}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {[
                { label: t("xpGuideAnnounce"), xp: "+3", positive: true },
                { label: t("xpGuideHard"), xp: "+5", positive: true },
                { label: t("xpGuideGood"), xp: "+10", positive: true },
                { label: t("xpGuideNew"), xp: "+15", positive: true },
                { label: t("xpGuideSession"), xp: "+20", positive: true },
                { label: t("xpGuideWrongAnnounce"), xp: "−5", positive: false },
                { label: t("xpGuideErrors"), xp: "−5", positive: false },
              ].map(({ label, xp, positive }) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-xs text-brand-muted">{label}</span>
                  <span className={`font-brandMono text-xs ${positive ? "text-brand-gold" : "text-red-400/80"}`}>
                    {xp} XP
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ZugElo — cote globale, courbe de progression, cotes par famille (chantier 4) */}
        <Card className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-brandMono text-xl text-brand-cream">{Math.round(stats.rating)}</span>
              <span className="text-xs text-brand-muted">{t("statsElo")}</span>
            </div>
            {stats.bestRating != null && Math.round(stats.bestRating) > Math.round(stats.rating) && (
              <span className="font-brandMono text-[10px] text-brand-muted">
                {t("statsEloBest", { rating: Math.round(stats.bestRating) })}
              </span>
            )}
          </div>

          <RatingCurve points={stats.ratingHistory} />

          {entitlements.features.familyRatingsVisible ? (
            stats.familyRatings.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
                {stats.familyRatings.map((fr) => (
                  <span
                    key={fr.family}
                    className="rounded-full bg-white/[0.06] px-3 py-1 font-brandMono text-xs text-brand-mutedLight"
                  >
                    {tFamily(fr.family)} · {Math.round(fr.rating)}
                  </span>
                ))}
              </div>
            )
          ) : (
            <p className="border-t border-white/[0.06] pt-3 font-brandMono text-[11px] text-brand-muted">
              {t("statsFamilyLocked")}
            </p>
          )}
        </Card>
      </div>

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

      {/* Jeu libre */}
      <Link href="/app/free-play" className={btnClass("ghost", "sm", "w-fit pl-0")}>
        {t("freePlayCta")} →
      </Link>
    </div>
  );
}

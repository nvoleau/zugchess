import { xpForLevel } from "@zugchess/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { getTodaySession } from "@/lib/schedulerService";
import { getPlayerStats } from "@/lib/statsService";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { btnClass } from "@/components/ui/button";
import { RatingCurve } from "@/components/rating/rating-curve";

export const dynamic = "force-dynamic";

function formatQuota(value: number, unlimited: string): string {
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

  const hasMastery = stats.themeMastery.some((tm) => tm.mastered + tm.familiar > 0);
  const rushAccuracy =
    stats.rushStats && stats.rushStats.totalCorrect + stats.rushStats.totalErrors > 0
      ? Math.round((stats.rushStats.totalCorrect / (stats.rushStats.totalCorrect + stats.rushStats.totalErrors)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* ── Hero : séance du jour ──────────────────────────────────── */}
      {hasSession ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand-accent/25 bg-brand-accent/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-2.5">
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-accent/70">
              {t("greeting", { name: user.name ?? user.email ?? "" })}
            </p>
            <div className="flex flex-wrap gap-2">
              {dueCount > 0 && <Badge variant="pill">{t("dueCount", { count: dueCount })}</Badge>}
              {newCount > 0 && (
                <span className="rounded-full bg-white/[0.06] px-3 py-1 font-brandMono text-sm text-brand-mutedLight">
                  {t("newCount", { count: newCount })}
                </span>
              )}
            </div>
          </div>
          <Link href="/app/play" className={btnClass("primary", "lg", "shrink-0 self-start sm:self-auto")}>
            {t("cta")} →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-brand-panel p-5 sm:p-6">
          <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-accent/70">
            {t("greeting", { name: user.name ?? user.email ?? "" })}
          </p>
          <p className="mt-2 font-brandDisplay text-xl text-brand-cream">{t("allDoneTitle")}</p>
          <p className="mt-1 text-sm text-brand-muted">{t("allDoneBody")}</p>
        </div>
      )}

      {/* ── 3 jauges : ZugElo | Série | Niveau ───────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">

        {/* ZugElo */}
        <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-brand-panel p-4">
          <p className="font-brandMono text-[10px] uppercase tracking-[0.12em] text-brand-muted">
            {t("statsElo")}
          </p>
          <p className="mt-2 font-brandMono text-3xl leading-none text-brand-cream sm:text-4xl">
            {Math.round(stats.rating)}
          </p>
          {stats.bestRating != null && Math.round(stats.bestRating) > Math.round(stats.rating) ? (
            <p className="mt-2 font-brandMono text-[10px] text-brand-muted">
              ▲&nbsp;{t("statsEloBest", { rating: Math.round(stats.bestRating) })}
            </p>
          ) : (
            <p className="mt-2 font-brandMono text-[10px] text-brand-muted opacity-0">—</p>
          )}
        </div>

        {/* Série */}
        <div className="flex flex-col justify-between rounded-xl border border-brand-accent/20 bg-brand-accent/[0.04] p-4">
          <p className="font-brandMono text-[10px] uppercase tracking-[0.12em] text-brand-accent/60">
            {t("statsStreak")}
          </p>
          <p className="mt-2 font-brandMono text-3xl leading-none text-brand-accent sm:text-4xl">
            {stats.streak.current}
          </p>
          {stats.streak.best > 0 ? (
            <p className="mt-2 font-brandMono text-[10px] text-brand-muted">
              ▲&nbsp;{t("statsStreakBest")}&nbsp;{stats.streak.best}
            </p>
          ) : (
            <p className="mt-2 font-brandMono text-[10px] text-brand-muted opacity-0">—</p>
          )}
        </div>

        {/* Niveau + mini barre XP */}
        <div className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-brand-panel p-4">
          <p className="font-brandMono text-[10px] uppercase tracking-[0.12em] text-brand-muted">
            {t("statsLevelLabel")}
          </p>
          <p className="mt-2 font-brandMono text-3xl leading-none text-brand-cream sm:text-4xl">
            {stats.level}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-700"
                style={{ width: `${Math.max(xpProgress * 100, 2)}%` }}
              />
            </div>
            <p className="font-brandMono text-[10px] text-brand-muted">
              {xpInLevel}&thinsp;/&thinsp;{xpRange}&thinsp;XP
            </p>
          </div>
        </div>
      </div>

      {/* ── Analyse principale : courbe ZugElo | maîtrise ─────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* ZugElo — courbe + cotes par famille */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
              {t("statsElo")}
            </p>
            {stats.bestRating != null && Math.round(stats.bestRating) > Math.round(stats.rating) && (
              <span className="font-brandMono text-[10px] text-brand-muted">
                {t("statsEloBest", { rating: Math.round(stats.bestRating) })}
              </span>
            )}
          </div>
          <RatingCurve points={stats.ratingHistory} height={72} />
          {entitlements.features.familyRatingsVisible ? (
            stats.familyRatings.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
                {stats.familyRatings.map((fr) => (
                  <span
                    key={fr.family}
                    className="rounded-full bg-white/[0.06] px-3 py-1 font-brandMono text-xs text-brand-mutedLight"
                  >
                    {tFamily(fr.family)}&nbsp;·&nbsp;{Math.round(fr.rating)}
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

        {/* Maîtrise par thème */}
        {hasMastery ? (
          <Card className="flex flex-col gap-3">
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
              {t("masteryTitle")}
            </p>
            <div className="flex flex-col gap-2.5">
              {stats.themeMastery
                .filter((tm) => tm.mastered + tm.familiar > 0)
                .map((tm) => {
                  const masteredPct = tm.total > 0 ? (tm.mastered / tm.total) * 100 : 0;
                  const familiarPct = tm.total > 0 ? ((tm.familiar - tm.mastered) / tm.total) * 100 : 0;
                  return (
                    <div key={tm.slug}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs text-brand-cream">{tm.title}</span>
                        <span className="shrink-0 font-brandMono text-[10px] text-brand-muted">
                          {tm.mastered}/{tm.total}
                        </span>
                      </div>
                      <div className="flex h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div className="h-full bg-brand-good transition-all duration-700" style={{ width: `${masteredPct}%` }} />
                        <div className="h-full bg-brand-accent2/60 transition-all duration-700" style={{ width: `${familiarPct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex gap-4 border-t border-white/[0.06] pt-2">
              <span className="flex items-center gap-1.5 font-brandMono text-[10px] text-brand-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-good" />
                {t("masteryLegendMastered")}
              </span>
              <span className="flex items-center gap-1.5 font-brandMono text-[10px] text-brand-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-accent2/60" />
                {t("masteryLegendFamiliar")}
              </span>
            </div>
          </Card>
        ) : (
          /* Placeholder quand pas encore de progrès */
          <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <p className="font-brandDisplay text-2xl text-brand-cream/20">♟</p>
            <p className="text-sm text-brand-muted">{t("masteryEmpty")}</p>
          </Card>
        )}
      </div>

      {/* ── Secondaire : points faibles + Rush ───────────────────── */}
      {(stats.weakSpots.length > 0 || stats.rushStats) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {stats.weakSpots.length > 0 && (
            <Card className="flex flex-col gap-3">
              <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
                {t("weakSpotsTitle")}
              </p>
              {stats.weakSpots.map((ws) => (
                <div key={ws.themeSlug}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-brand-cream">{ws.title}</span>
                    <span className="shrink-0 font-brandMono text-[10px] text-brand-bad">
                      {Math.round(ws.errorRate * 100)}%
                    </span>
                  </div>
                  <div className="h-[4px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-brand-bad transition-all duration-700"
                      style={{ width: `${ws.errorRate * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-brand-muted">{t("weakSpotsHint")}</p>
            </Card>
          )}

          {stats.rushStats && (
            <Card className="flex flex-col gap-4">
              <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-muted">
                {t("rushStatsTitle")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-brandMono text-3xl leading-none text-brand-accent">
                    {stats.rushStats.bestScore}
                  </p>
                  <p className="mt-1 text-[10px] text-brand-muted">{t("rushStatsBest")}</p>
                </div>
                <div>
                  <p className="font-brandMono text-3xl leading-none text-brand-cream">
                    {stats.rushStats.runs}
                  </p>
                  <p className="mt-1 text-[10px] text-brand-muted">{t("rushStatsRuns")}</p>
                </div>
                <div>
                  <p className="font-brandMono text-3xl leading-none text-brand-cream">
                    {rushAccuracy}%
                  </p>
                  <p className="mt-1 text-[10px] text-brand-muted">{t("rushStatsAccuracy")}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Footer : quotas + jeu libre ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span className="font-brandMono text-xs text-brand-muted">
            <span className="text-brand-mutedLight">
              {formatQuota(entitlements.remaining.newPositions, "∞")}
            </span>
            &ensp;{t("newPositions")}
          </span>
          <span className="font-brandMono text-xs text-brand-muted">
            <span className="text-brand-mutedLight">
              {formatQuota(entitlements.remaining.reviews, "∞")}
            </span>
            &ensp;{t("reviews")}
          </span>
          <span className="font-brandMono text-xs text-brand-muted">
            <span className="text-brand-mutedLight">
              {formatQuota(entitlements.remaining.explanations, "∞")}
            </span>
            &ensp;{t("explanations")}
          </span>
        </div>
        <Link
          href="/app/free-play"
          className="font-brandMono text-xs text-brand-muted transition-colors hover:text-brand-cream"
        >
          {t("freePlayCta")} →
        </Link>
      </div>
    </div>
  );
}

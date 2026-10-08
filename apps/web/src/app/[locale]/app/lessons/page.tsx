import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { listThemeStats } from "@/lib/positionService";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const MASTERY_COLOR = {
  mastered: "bg-brand-good",
  familiar: "bg-brand-gold",
  learning: "bg-amber-500",
  new: "bg-white/10",
} as const;

export default async function LessonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session!.user.id!;
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const [t, themes] = await Promise.all([
    getTranslations("App.Lessons"),
    listThemeStats(userId, localeTyped),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-brandSerif text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-brand-muted">{t("intro")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const done = theme.masteredCount + theme.familiarCount;
          const pct = theme.total > 0 ? Math.round((done / theme.total) * 100) : 0;
          return (
            <Link
              key={theme.id}
              href={`/app/lessons/theme/${theme.slug}`}
              className="group flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-brand-panel p-5 transition-colors hover:border-brand-gold/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-brandMono text-[10px] uppercase tracking-[0.12em] text-brand-muted">
                    {theme.family}
                  </p>
                  <h2 className="mt-0.5 font-brandSerif text-lg leading-tight text-brand-cream group-hover:text-brand-gold">
                    {theme.title}
                  </h2>
                </div>
                <span className="shrink-0 font-brandMono text-xs text-brand-muted">
                  {t("positions", { count: theme.total })}
                </span>
              </div>

              {/* Barre de progression par segments */}
              <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                {theme.total > 0 && (
                  <>
                    <div className={`h-full ${MASTERY_COLOR.mastered} transition-all`} style={{ width: `${(theme.masteredCount / theme.total) * 100}%` }} />
                    <div className={`h-full ${MASTERY_COLOR.familiar} transition-all`} style={{ width: `${(theme.familiarCount / theme.total) * 100}%` }} />
                    <div className={`h-full ${MASTERY_COLOR.learning} transition-all`} style={{ width: `${(theme.learningCount / theme.total) * 100}%` }} />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span>{done} / {theme.total} {localeTyped === "fr" ? "maîtrisées" : "mastered"}</span>
                <span className="font-brandMono text-brand-gold opacity-0 transition-opacity group-hover:opacity-100">
                  {t("explore")}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

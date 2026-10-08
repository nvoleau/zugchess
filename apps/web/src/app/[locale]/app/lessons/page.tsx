import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { listThemesWithPositions } from "@/lib/positionService";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const MASTERY_CLASS = {
  new: "text-brand-muted",
  learning: "text-amber-400",
  familiar: "text-brand-gold",
  mastered: "text-brand-good",
} as const;

export default async function LessonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session!.user.id!;
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const [t, themes] = await Promise.all([
    getTranslations("App.Lessons"),
    listThemesWithPositions(userId, localeTyped),
  ]);

  const badgeLabel: Record<"new" | "learning" | "familiar" | "mastered", string> = {
    new: t("badgeNew"),
    learning: t("badgeLearning"),
    familiar: t("badgeFamiliar"),
    mastered: t("badgeMastered"),
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-brandSerif text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-brand-muted">{t("intro")}</p>
      </div>

      {themes.map((theme) => (
        <section key={theme.id} className="flex flex-col gap-3">
          <h2 className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
            {theme.title}
          </h2>

          {theme.positions.length === 0 ? (
            <p className="text-sm text-brand-muted">{t("noPositions")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {theme.positions.map((pos) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-brand-panel px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{pos.title}</span>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className={`font-brandMono text-xs ${MASTERY_CLASS[pos.mastery]}`}>
                      {badgeLabel[pos.mastery]}
                    </span>
                    <Link
                      href={`/app/lessons/${pos.id}`}
                      className="rounded-full border border-brand-gold/40 px-3 py-1 font-brandMono text-xs text-brand-gold transition-colors hover:bg-brand-gold/10"
                    >
                      {t("replay")} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

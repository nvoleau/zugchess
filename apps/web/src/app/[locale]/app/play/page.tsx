import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTodaySession } from "@/lib/schedulerService";
import { SessionPlayer } from "@/components/play/session-player";

// Garde d'authentification centralisée dans app/layout.tsx.
export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const user = session!.user;

  const [t, tSession] = await Promise.all([
    getTranslations("Play"),
    getTranslations("Play.Session"),
  ]);

  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";
  const todaySession = await getTodaySession(user.id as string, localeTyped);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app" className={btnClass("ghost", "sm", "pl-0 text-brand-muted")}>
          ← {t("backToApp")}
        </Link>
        <h1 className="mt-3 font-brandSerif text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-brand-muted">{t("intro")}</p>
      </div>

      {todaySession.items.length === 0 ? (
        <Card className="max-w-md">
          <p className="font-brandSerif text-xl">{tSession("empty")}</p>
          <p className="mt-2 text-sm text-brand-muted">{tSession("emptyBody")}</p>
          <Link
            href="/app/free-play"
            className={btnClass("secondary", "sm", "mt-5 w-fit")}
          >
            {tSession("emptyCta")}
          </Link>
        </Card>
      ) : (
        <SessionPlayer items={todaySession.items} locale={localeTyped} />
      )}
    </div>
  );
}

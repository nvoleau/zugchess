import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RankingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("App.ComingSoon");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/app" className={btnClass("ghost", "sm", "pl-0 text-brand-muted")}>
        ← {t("backToApp")}
      </Link>
      <div className="max-w-lg">
        <h1 className="font-brandSerif text-4xl tracking-tight sm:text-5xl">{t("rankingTitle")}</h1>
        <p className="mt-4 text-brand-muted">{t("rankingBody")}</p>
      </div>
    </div>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { FinaleSession } from "@/components/play/finale-session";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

// Les 12 positions du lot 2 (reprises du prototype « Finales au tempo ») : annonce du résultat,
// puis juge KPK partagé ou ligne de méthode. Pas de répétition espacée ici, c'est le lot 5.
export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const t = await getTranslations("Play");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/app" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          {t("backToApp")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("intro")}</p>
      </div>

      <FinaleSession locale={locale as AppLocale} />
    </div>
  );
}

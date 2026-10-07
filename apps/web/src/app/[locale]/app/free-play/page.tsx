import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { FreePlay } from "@/components/play/free-play";
import { Link, redirect } from "@/i18n/navigation";

// Jeu libre (lot 3) : juge Syzygy (tablebase.lichess.ovh, caché dans Neon), jusqu'à 7 pièces.
export const dynamic = "force-dynamic";

export default async function FreePlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const t = await getTranslations("Play.FreePlay");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/app" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          {t("backToApp")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("intro")}</p>
      </div>

      <FreePlay />
    </div>
  );
}

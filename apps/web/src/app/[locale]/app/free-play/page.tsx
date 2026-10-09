import { getTranslations, setRequestLocale } from "next-intl/server";
import { FreePlay } from "@/components/play/free-play";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";

// Jeu libre (lot 3) : juge Syzygy (tablebase.lichess.ovh, caché dans Neon), jusqu'à 7 pièces.
// Garde d'authentification centralisée dans app/layout.tsx.
export const dynamic = "force-dynamic";

export default async function FreePlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Play.FreePlay");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app" className={btnClass("ghost", "sm", "pl-0 text-brand-muted")}>
          ← {t("backToApp")}
        </Link>
        <h1 className="mt-3 font-brandDisplay text-3xl tracking-tight">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-brand-muted">{t("intro")}</p>
      </div>

      <FreePlay />
    </div>
  );
}

import type { MethodLine } from "@zugchess/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { KpkTrainer } from "@/components/play/kpk-trainer";
import { MethodLineTrainer } from "@/components/play/method-line-trainer";
import { Link, redirect } from "@/i18n/navigation";

// Prototype du moteur de jeu (lot 2) : juge KPK + ligne de méthode branchés sur un vrai échiquier.
// Deux positions d'exemple seulement — le catalogue des 300 positions arrive au lot 4.
export const dynamic = "force-dynamic";

const KPK_DEMO_FEN = "7k/8/8/8/8/1P6/8/7K w - - 0 1";

const LUCENA_LINE: MethodLine = {
  fen: "8/4PK2/8/6k1/8/8/8/R6r w - - 0 1",
  playerSide: "white",
  steps: [
    {
      move: { from: "a1", to: "a4" },
      comment: {
        fr: "La tour construit un pont sur la 4e rangée pour abriter le roi des échecs latéraux.",
        en: "The rook builds a bridge on the 4th rank to shelter the king from side checks.",
      },
    },
    {
      move: { from: "h1", to: "h7" },
      comment: {
        fr: "Le camp noir essaie les échecs sur la colonne du roi.",
        en: "Black tries checks along the king's file.",
      },
    },
    {
      move: { from: "f7", to: "e6" },
      comment: {
        fr: "Le roi blanc se met à l'abri sur le pont : la promotion n'est plus qu'une formalité.",
        en: "The white king shelters on the bridge: promotion is now a formality.",
      },
    },
  ],
};

export default async function PlayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const t = await getTranslations("Play");

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/app" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          {t("backToApp")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("intro")}</p>
      </div>

      <section className="flex flex-col items-center gap-3">
        <h2 className="text-lg font-semibold">{t("kpkTitle")}</h2>
        <KpkTrainer initialFen={KPK_DEMO_FEN} playerSide="white" />
      </section>

      <section className="flex flex-col items-center gap-3">
        <h2 className="text-lg font-semibold">{t("methodTitle")}</h2>
        <MethodLineTrainer line={LUCENA_LINE} />
      </section>
    </div>
  );
}

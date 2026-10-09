import { getTranslations, setRequestLocale } from "next-intl/server";
import { OnboardingTrial } from "@/components/play/onboarding-trial";

// Essai sans compte — ni Prisma ni session requise pour le jeu.
export default async function TryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Try" });

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("intro")}</p>
      </div>
      <OnboardingTrial />
    </div>
  );
}

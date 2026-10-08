import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";
import { getPosition } from "@/lib/positionService";
import { ReplayCard } from "./replay-card";

export const dynamic = "force-dynamic";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";
  const [t, position] = await Promise.all([
    getTranslations("App.Lessons"),
    getPosition(id, localeTyped),
  ]);

  if (!position) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/app/lessons" className={btnClass("ghost", "sm", "pl-0 text-brand-muted")}>
        {t("replayBack")}
      </Link>
      <ReplayCard position={position} lessonsHref={`/${locale}/app/lessons`} />
    </div>
  );
}

import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getEntitlementsForUser } from "@/lib/entitlements";
import { listPositionsForTheme } from "@/lib/positionService";
import { prisma } from "@/lib/prisma";
import { ThemeStudyClient } from "./study-client";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 10;

export default async function ThemeLessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale, slug } = await params;
  const { id: initialId } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session!.user.id!;
  const localeTyped = (locale === "en" ? "en" : "fr") as "fr" | "en";

  const [t, entitlements, { positions, total }, theme] = await Promise.all([
    getTranslations("App.Lessons"),
    getEntitlementsForUser(userId),
    listPositionsForTheme(slug, userId, localeTyped, 0, 500),
    prisma.theme.findUnique({ where: { slug }, select: { title: true } }),
  ]);

  if (!theme) notFound();

  const isPremium = entitlements.plan !== "free";
  const visiblePositions = isPremium ? positions : positions.slice(0, FREE_LIMIT);
  const lockedCount = isPremium ? 0 : Math.max(0, total - FREE_LIMIT);

  const titleJson = theme.title as Record<string, string>;
  const themeTitle = titleJson[localeTyped] ?? titleJson.fr ?? slug;

  return (
    <div className="flex flex-col gap-3 -mx-4 md:-mx-8">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 px-4 md:px-8">
        <Link
          href="/app/lessons"
          className="font-brandMono text-xs text-brand-muted hover:text-brand-cream"
        >
          {t("themeBack")}
        </Link>
        <span className="font-brandMono text-xs text-brand-muted/40">›</span>
        <span className="font-brandMono text-xs text-brand-cream">{themeTitle}</span>
        <span className="font-brandMono text-xs text-brand-muted/40">·</span>
        <span className="font-brandMono text-xs text-brand-muted">
          {isPremium ? total : `${visiblePositions.length} / ${total}`}
        </span>
      </div>

      <ThemeStudyClient
        positions={visiblePositions}
        lockedCount={lockedCount}
        initialId={initialId}
      />
    </div>
  );
}

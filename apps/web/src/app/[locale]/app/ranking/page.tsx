import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { btnClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLeaderboard } from "@/lib/leaderboardService";

export const dynamic = "force-dynamic";

type TabKind = "rating" | "xp" | "streak";

function valueLabel(kind: TabKind, value: number, t: (k: string) => string): string {
  if (kind === "xp") return `${value} XP`;
  if (kind === "streak") return `${value} ${t("streakUnit")}`;
  return String(value);
}

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("App.Ranking");
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";

  const kind: TabKind = (["rating", "xp", "streak"] as const).includes(tab as TabKind)
    ? (tab as TabKind)
    : "rating";

  const entries = await getLeaderboard(kind);

  const tabs: { key: TabKind; label: string }[] = [
    { key: "rating", label: t("tabRating") },
    { key: "xp", label: t("tabXp") },
    { key: "streak", label: t("tabStreak") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/app" className={btnClass("ghost", "sm", "pl-0 text-brand-muted")}>
          ← {t("backToApp")}
        </Link>
        <h1 className="mt-4 font-brandDisplay text-4xl tracking-tight sm:text-5xl">{t("title")}</h1>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-0">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/app/ranking?tab=${key}`}
            className={[
              "px-4 py-2 font-brandMono text-sm transition-colors",
              kind === key
                ? "border-b-2 border-brand-accent text-brand-accent"
                : "text-brand-muted hover:text-brand-cream",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tableau */}
      <Card className="p-0 overflow-hidden">
        {entries.length === 0 ? (
          <p className="p-6 text-sm text-brand-muted">{t("empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {entries.map((entry) => {
                const isMe = entry.userId === currentUserId;
                return (
                  <tr
                    key={entry.userId}
                    className={[
                      "flex items-center gap-4 px-5 py-3 border-b border-white/[0.06] last:border-0",
                      isMe ? "bg-brand-accent/[0.07]" : "hover:bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <td className="w-7 font-brandMono text-brand-muted text-right shrink-0">
                      {entry.rank}
                    </td>
                    {entry.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatar}
                        alt=""
                        className="h-7 w-7 rounded-full shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/10 shrink-0" />
                    )}
                    <td className="flex-1 text-brand-cream truncate">
                      {entry.name}
                      {isMe && (
                        <span className="ml-2 font-brandMono text-xs text-brand-accent">{t("you")}</span>
                      )}
                    </td>
                    <td className="font-brandMono text-brand-accent shrink-0">
                      {valueLabel(kind, entry.value, t)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

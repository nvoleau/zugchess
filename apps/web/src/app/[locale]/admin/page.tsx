import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(locale);

  const t = await getTranslations("Admin.Dashboard");

  const [userCount, positionStats, cardCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    prisma.position.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.card.count(),
    prisma.reviewLog.count(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of positionStats) {
    byStatus[row.status] = row._count.id;
  }
  const totalPositions = Object.values(byStatus).reduce((s, n) => s + n, 0);

  const tdClass = "py-2 pr-8 tabular-nums";

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("users"), value: userCount },
          { label: t("positions"), value: totalPositions },
          { label: t("cards"), value: cardCount },
          { label: t("reviews"), value: reviewCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-2xl font-mono font-semibold">{value}</p>
            <p className="mt-0.5 text-sm text-neutral-500">{label}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("positionsByStatus")}</h2>
        <table className="text-sm">
          <tbody>
            {(["published", "draft", "archived"] as const).map((s) => (
              <tr key={s}>
                <td className={tdClass}>{s}</td>
                <td className={tdClass + " text-right"}>{byStatus[s] ?? 0}</td>
                <td>
                  <Link
                    href={`/admin/positions?status=${s}`}
                    className="text-xs underline text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    {t("see")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <nav className="flex gap-4">
        <Link href="/admin/users" className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          {t("manageUsers")}
        </Link>
        <Link href="/admin/positions" className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          {t("managePositions")}
        </Link>
      </nav>
    </div>
  );
}

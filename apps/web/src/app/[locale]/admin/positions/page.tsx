import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPositionsForAdmin, listThemesForAdmin } from "@/lib/adminPositionService";

export const dynamic = "force-dynamic";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function buildHref(status: string | undefined, theme: string | undefined, page: number): string {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (theme) qs.set("theme", theme);
  qs.set("page", String(page));
  return `/admin/positions?${qs.toString()}`;
}

export default async function AdminPositionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; theme?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status, theme, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const statusFilter = status === "draft" || status === "published" || status === "archived" ? status : undefined;

  const t = await getTranslations("Admin.Positions");
  const [themes, { items, total, pageSize }] = await Promise.all([
    listThemesForAdmin(),
    listPositionsForAdmin({ status: statusFilter, themeSlug: theme, page }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Link href="/admin/positions/new" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          {t("new")}
        </Link>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <select name="status" defaultValue={status ?? ""} className={inputClass}>
          <option value="">{t("allStatuses")}</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <select name="theme" defaultValue={theme ?? ""} className={inputClass}>
          <option value="">{t("allThemes")}</option>
          {themes.map((th) => (
            <option key={th.id} value={th.slug}>
              {th.slug}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          {t("filter")}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="py-2 pr-4">{t("columns.title")}</th>
              <th className="py-2 pr-4">{t("columns.theme")}</th>
              <th className="py-2 pr-4">{t("columns.judgeType")}</th>
              <th className="py-2 pr-4">{t("columns.status")}</th>
              <th className="py-2 pr-4">{t("columns.free")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((position) => (
              <tr key={position.id} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 pr-4">
                  <Link href={`/admin/positions/${position.id}`} className="underline">
                    {position.title || position.id}
                  </Link>
                </td>
                <td className="py-2 pr-4">{position.themeSlug}</td>
                <td className="py-2 pr-4">{position.judgeType}</td>
                <td className="py-2 pr-4">{position.status}</td>
                <td className="py-2 pr-4">{position.free ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-sm">
        {page > 1 && <Link href={buildHref(status, theme, page - 1)}>{t("prev")}</Link>}
        <span>{t("pageInfo", { page, totalPages })}</span>
        {page < totalPages && <Link href={buildHref(status, theme, page + 1)}>{t("next")}</Link>}
      </div>
    </div>
  );
}

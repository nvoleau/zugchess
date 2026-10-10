import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listUsers } from "@/lib/adminUserService";

export const dynamic = "force-dynamic";

function buildHref(query: string | undefined, page: number): string {
  const qs = new URLSearchParams();
  if (query) qs.set("query", query);
  qs.set("page", String(page));
  return `/admin/users?${qs.toString()}`;
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { query, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const t = await getTranslations("Admin.Users");
  const { items, total, pageSize } = await listUsers({ query, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="query"
          defaultValue={query ?? ""}
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          {t("search")}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="py-2 pr-4">{t("columns.identity")}</th>
              <th className="py-2 pr-4">{t("columns.plan")}</th>
              <th className="py-2 pr-4">{t("columns.status")}</th>
              <th className="py-2 pr-4">{t("columns.founder")}</th>
              <th className="py-2 pr-4">{t("columns.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 pr-4">
                  <Link href={`/admin/users/${user.id}`} className="underline">
                    {user.name ?? user.email ?? user.id}
                  </Link>
                  {user.name && user.email && (
                    <span className="ml-2 text-xs text-neutral-500">{user.email}</span>
                  )}
                </td>
                <td className="py-2 pr-4">{user.plan}</td>
                <td className="py-2 pr-4">{user.status}</td>
                <td className="py-2 pr-4">{user.founder ? "✓" : ""}</td>
                <td className="py-2 pr-4">{user.createdAt.toLocaleDateString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-sm">
        {page > 1 && <Link href={buildHref(query, page - 1)}>{t("prev")}</Link>}
        <span>{t("pageInfo", { page, totalPages })}</span>
        {page < totalPages && <Link href={buildHref(query, page + 1)}>{t("next")}</Link>}
      </div>
    </div>
  );
}

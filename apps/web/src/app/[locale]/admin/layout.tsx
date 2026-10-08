import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdminSession(locale);

  const t = await getTranslations("Admin.nav");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <Link href="/admin" className="font-mono text-sm font-semibold tracking-wide">
          ZugChess <span className="text-neutral-400">admin</span>
        </Link>
        <Link
          href="/app"
          className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          ← app
        </Link>
      </header>
      <div className="flex flex-col gap-6">
        <nav className="flex gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800 text-sm">
          <Link href="/admin" className="font-medium hover:underline text-neutral-500">
            {t("dashboard")}
          </Link>
          <Link href="/admin/users" className="font-medium hover:underline">
            {t("users")}
          </Link>
          <Link href="/admin/positions" className="font-medium hover:underline">
            {t("positions")}
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}

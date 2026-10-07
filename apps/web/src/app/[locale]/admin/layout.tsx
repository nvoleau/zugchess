import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/adminAuth";

// Dépend de la session (rôle) : jamais mis en cache statique.
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
        <Link href="/" className="font-semibold">
          ZugChess <span className="text-neutral-400">· admin</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-col gap-6">
        <nav className="flex gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
          <Link href="/admin/users" className="text-sm font-medium underline">
            {t("users")}
          </Link>
          <Link href="/admin/positions" className="text-sm font-medium underline">
            {t("positions")}
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}

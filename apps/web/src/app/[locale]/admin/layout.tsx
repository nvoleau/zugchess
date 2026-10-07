import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
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
  );
}

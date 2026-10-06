"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Locale");
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex gap-1 text-sm">
      {routing.locales.map((candidate) => (
        <button
          key={candidate}
          onClick={() => router.replace(pathname, { locale: candidate })}
          aria-current={candidate === locale}
          className={`rounded-md px-2 py-1 ${
            candidate === locale
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "border border-neutral-300 dark:border-neutral-700"
          }`}
        >
          {t(candidate)}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-[132px]" aria-hidden />;
  }

  return (
    <select
      aria-label={t("light") + " / " + t("dark") + " / " + t("system")}
      value={theme}
      onChange={(event) => setTheme(event.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
    >
      <option value="light">{t("light")}</option>
      <option value="dark">{t("dark")}</option>
      <option value="system">{t("system")}</option>
    </select>
  );
}

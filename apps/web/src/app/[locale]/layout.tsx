import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  title: "ZugChess",
  description: "Apprends, comprends et joue toutes les finales d'échecs.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <Link href="/" className="font-semibold">
                ZugChess
              </Link>
              <div className="flex items-center gap-3">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
            </header>
            <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

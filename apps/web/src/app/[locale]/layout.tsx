import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Cursor } from "@/components/ui/cursor";
import { routing, type AppLocale } from "@/i18n/routing";
import "../globals.css";

export const metadata: Metadata = {
  title: "ZugChess",
  description: "Apprends, comprends et joue toutes les finales d'échecs.",
};

// Polices de l'identité de marque (accueil + app) — chargées une fois ici en variables CSS ;
// sans effet sur les pages qui ne référencent pas font-brandSans/brandMono/brandSerif (admin,
// login, try gardent leur typographie Tailwind par défaut).
const brandSans = Geist({ subsets: ["latin"], variable: "--font-brand-sans" });
const brandMono = Geist_Mono({ subsets: ["latin"], variable: "--font-brand-mono" });
const brandSerif = Instrument_Serif({ subsets: ["latin"], style: ["normal", "italic"], weight: "400", variable: "--font-brand-serif" });

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
      <body
        className={`min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100 ${brandSans.variable} ${brandMono.variable} ${brandSerif.variable}`}
      >
        <Cursor />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
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
  appleWebApp: {
    capable: true,
    title: "ZugChess",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E12",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Polices de l'identité de marque (accueil + app, direction "Zugzwang" — chantier 3) — chargées
// une fois ici en variables CSS ; sans effet sur les pages qui ne référencent pas
// font-brandSans/brandMono/brandDisplay (admin, login, try gardent leur typographie Tailwind par
// défaut). Pas de police serif distincte : le titrage utilise aussi IBM Plex Mono
// (`fontFamily.brandDisplay` dans tailwind.config.ts pointe vers la même variable que brandMono).
const brandSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-brand-sans" });
const brandMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-brand-mono" });

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
        className={`min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100 ${brandSans.variable} ${brandMono.variable}`}
      >
        <Cursor />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-shell/app-nav";
import { Link, redirect } from "@/i18n/navigation";
import { getEntitlementsForUser } from "@/lib/entitlements";

// Dépend de la session et des quotas du jour : jamais mis en cache statique.
export const dynamic = "force-dynamic";

function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Habillage sombre de l'app (identité de marque) : logo, 4 onglets, badge d'offre, avatar.
 * Centralise la garde d'authentification pour toutes les pages `/app/*` — avant, chaque page
 * (accueil, séance, jeu libre) refaisait le même `auth()` + redirect individuellement.
 */
export default async function AppShellLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }
  const user = session!.user;

  const [t, entitlements] = await Promise.all([getTranslations("App.Nav"), getEntitlementsForUser(user.id)]);

  return (
    <div className="min-h-screen bg-brand-ink font-brandSans text-brand-cream">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-brand-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brand-gold text-lg leading-none text-brand-ink">
              ♜
            </span>
            <span className="font-brandSerif text-2xl">ZugChess</span>
          </Link>

          <AppNav labels={{ home: t("home"), session: t("session"), lessons: t("lessons"), ranking: t("ranking") }} />

          <div className="flex items-center gap-3.5">
            <span className="rounded-full border border-brand-gold/40 px-2.5 py-1 font-brandMono text-xs text-brand-gold">
              {entitlements.plan === "premium" ? t("planPremium") : t("planFree")}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold/50 bg-[#2A251B] text-xs font-semibold">
              {initialsOf(user.name, user.email)}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MobileNav } from "@/components/marketing/mobile-nav";

export async function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations("Marketing.nav");

  const navLabels = {
    method: t("method"),
    programme: t("programme"),
    progression: t("progression"),
    pricing: t("pricing"),
    about: t("about"),
    login: t("login"),
    goToApp: t("goToApp"),
    signup: t("signup"),
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-brand-ink/[0.82] backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand-accent text-xl leading-none text-brand-ink transition-transform hover:scale-105">
            ♜
          </span>
          <span className="font-brandDisplay text-[26px] tracking-tight">ZugChess</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-sm text-brand-muted md:flex">
          <Link href="/#methode" className="nav-link hover:text-brand-cream">{t("method")}</Link>
          <Link href="/#programme" className="nav-link hover:text-brand-cream">{t("programme")}</Link>
          <Link href="/#progression" className="nav-link hover:text-brand-cream">{t("progression")}</Link>
          <Link href="/#tarifs" className="nav-link hover:text-brand-cream">{t("pricing")}</Link>
          <Link href="/about" className="nav-link hover:text-brand-cream">{t("about")}</Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2.5 md:flex">
          {!isAuthenticated && (
            <Link href="/login" className="px-3.5 py-2.5 text-sm text-brand-cream hover:text-brand-accent">
              {t("login")}
            </Link>
          )}
          <Link
            href={isAuthenticated ? "/app" : "/try"}
            className="rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-brand-ink transition-all hover:bg-brand-accentHover hover:scale-[1.03] active:scale-[0.97]"
          >
            {isAuthenticated ? t("goToApp") : t("signup")}
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={isAuthenticated ? "/app" : "/try"}
            className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink"
          >
            {isAuthenticated ? t("goToApp") : t("signup")}
          </Link>
          <MobileNav isAuthenticated={isAuthenticated} labels={navLabels} />
        </div>
      </div>
    </header>
  );
}

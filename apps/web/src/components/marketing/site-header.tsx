import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations("Marketing.nav");

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-brand-ink/[0.82] backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand-gold text-xl leading-none text-brand-ink">
            ♜
          </span>
          <span className="font-brandSerif text-[26px] tracking-tight">ZugChess</span>
        </div>

        <nav className="flex flex-wrap gap-7 text-sm text-brand-muted">
          <a href="#methode" className="hover:text-brand-cream">
            {t("method")}
          </a>
          <a href="#programme" className="hover:text-brand-cream">
            {t("programme")}
          </a>
          <a href="#progression" className="hover:text-brand-cream">
            {t("progression")}
          </a>
          <a href="#tarifs" className="hover:text-brand-cream">
            {t("pricing")}
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          {!isAuthenticated && (
            <Link href="/login" className="px-3.5 py-2.5 text-sm text-brand-cream hover:text-brand-gold">
              {t("login")}
            </Link>
          )}
          <Link
            href={isAuthenticated ? "/app" : "/try"}
            className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-goldHover"
          >
            {t("signup")}
          </Link>
        </div>
      </div>
    </header>
  );
}

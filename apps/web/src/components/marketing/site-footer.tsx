import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Marketing.footer");

  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 px-5 py-8 text-[13px] text-brand-muted sm:px-10">
        <span>{t("copyright")}</span>
        <div className="flex flex-wrap gap-6">
          <Link href="/about" className="nav-link hover:text-brand-cream">
            {t("about")}
          </Link>
          <span className="nav-link cursor-not-allowed opacity-50">{t("legal")}</span>
          <span className="nav-link cursor-not-allowed opacity-50">{t("privacy")}</span>
          <Link href="/contact" className="nav-link hover:text-brand-cream">
            {t("contact")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

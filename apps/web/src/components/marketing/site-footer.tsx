import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("Marketing.footer");

  return (
    <footer className="border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 px-5 py-8 text-[13px] text-brand-muted sm:px-10">
        <span>{t("copyright")}</span>
        <div className="flex flex-wrap gap-6">
          <a href="#" className="text-brand-muted hover:text-brand-cream">
            {t("legal")}
          </a>
          <a href="#" className="text-brand-muted hover:text-brand-cream">
            {t("privacy")}
          </a>
          <a href="#" className="text-brand-muted hover:text-brand-cream">
            {t("contact")}
          </a>
        </div>
      </div>
    </footer>
  );
}

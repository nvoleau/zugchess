import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function FinalCta() {
  const t = await getTranslations("Marketing.finalCta");

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-28">
      <div className="grid grid-cols-1 items-center gap-10 overflow-hidden rounded-[32px] border border-white/[0.08] bg-brand-panel p-7 sm:grid-cols-2 sm:p-14">
        <div className="flex flex-col gap-[22px]">
          <h2 className="text-balance font-brandDisplay text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-tight">
            {t("title")} <em className="text-brand-accent">{t("titleEm")}</em>
          </h2>
          <p className="max-w-[440px] text-base leading-relaxed text-brand-muted">{t("body")}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-brand-accent px-7 py-4 text-base font-semibold text-brand-ink hover:bg-brand-accentHover"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/25 px-[26px] py-4 text-base text-brand-cream hover:border-brand-accent hover:text-brand-accent"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
        <div className="flex h-[200px] items-center justify-center rounded-2xl border border-white/10 text-6xl sm:h-[360px]">♚</div>
      </div>
    </section>
  );
}

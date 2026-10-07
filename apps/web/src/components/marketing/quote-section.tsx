import { getTranslations } from "next-intl/server";

export async function QuoteSection() {
  const t = await getTranslations("Marketing.quote");

  return (
    <section className="border-y border-white/[0.08] bg-brand-panelAlt">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-5 py-14 text-center sm:py-20">
        <span className="font-brandSerif text-[56px] leading-[0.5] text-brand-gold">&ldquo;</span>
        <p className="text-balance font-brandSerif text-[clamp(28px,4vw,46px)] font-normal leading-[1.15]">{t("text")}</p>
        <span className="text-sm text-brand-muted">{t("author")}</span>
      </div>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { HeroTrial } from "@/components/marketing/hero-trial";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";

export async function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations("Marketing.hero");

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-[10%] -top-[20%] h-[780px] w-[780px] rounded-full bg-[radial-gradient(closest-side,rgba(226,182,90,0.14),rgba(226,182,90,0))]" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-2 lg:gap-20">

        <div className="flex flex-col gap-7">
          <Reveal delay={0}>
            <div className="flex items-center gap-2.5 font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">
              <span className="h-px w-6 bg-brand-gold" />
              {t("kicker")}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="text-balance font-brandSerif text-[clamp(48px,7vw,92px)] font-normal leading-[0.98] tracking-tight">
              {t("titleLine1")} <em className="text-brand-gold">{t("titleEm")}</em>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="max-w-[500px] text-pretty text-lg leading-relaxed text-brand-muted">{t("body")}</p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-wrap gap-3">
              <Link
                href={isAuthenticated ? "/app" : "/login"}
                className="flex items-center gap-3 rounded-full bg-brand-gold px-7 py-4 text-base font-semibold text-brand-ink transition-all hover:bg-brand-goldHover hover:scale-[1.02] active:scale-[0.97]"
              >
                {t("ctaPrimary")} <span>→</span>
              </Link>
              <Link
                href="/try"
                className="flex items-center rounded-full border border-white/[0.22] px-[26px] py-4 text-base text-brand-cream transition-all hover:border-brand-gold hover:text-brand-gold hover:scale-[1.02] active:scale-[0.97]"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <div className="flex flex-wrap gap-6 border-t border-white/[0.08] pt-5 sm:gap-11">
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat1Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat1Label")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat2Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat2Label")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-brandSerif text-4xl">{t("stat3Value")}</span>
                <span className="text-[13px] text-brand-muted">{t("stat3Label")}</span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={180} className="flex w-full max-w-[520px] flex-col gap-4 justify-self-center">
          <HeroTrial />
        </Reveal>
      </div>
    </section>
  );
}

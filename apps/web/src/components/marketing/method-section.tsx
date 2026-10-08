import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/reveal";

export async function MethodSection() {
  const t = await getTranslations("Marketing.method");
  const tempo = await getTranslations("Marketing.tempo");

  return (
    <section id="methode" className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-16 sm:px-10 sm:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="max-w-[640px] text-balance font-brandSerif text-[clamp(40px,5.5vw,68px)] font-normal leading-none tracking-tight">
            {t("title")} <em className="text-brand-gold">{t("titleEm")}</em>
          </h2>
          <p className="max-w-[380px] text-base leading-relaxed text-brand-muted">{t("body")}</p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Reveal delay={0}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
            <span className="self-start rounded-full border-[1.5px] border-brand-cream px-3.5 py-1 font-brandMono text-[15px]">01</span>
            <h3 className="text-[22px] font-medium">{t("step1Title")}</h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">{t("step1Body")}</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
            <span className="self-start rounded-full border-[1.5px] border-brand-cream px-3.5 py-1 font-brandMono text-[15px]">02</span>
            <h3 className="text-[22px] font-medium">{t("step2Title")}</h3>
            <p className="text-[15px] leading-relaxed text-brand-muted">{t("step2Body")}</p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="flex h-full flex-col gap-[18px] rounded-[22px] bg-brand-gold p-7 text-brand-ink transition-all duration-300 hover:-translate-y-1">
            <span className="self-start rounded-full border-[1.5px] border-brand-ink px-3.5 py-1 font-brandMono text-[15px]">03</span>
            <h3 className="text-[22px] font-medium">{t("step3Title")}</h3>
            <p className="text-[15px] leading-relaxed text-[#2B2214]">{t("step3Body")}</p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0}>
        <div className="grid grid-cols-1 items-center gap-10 rounded-[28px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:border-white/[0.14] sm:grid-cols-2 sm:p-12">
          <div className="flex flex-col gap-4">
            <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">{tempo("kicker")}</span>
            <h3 className="font-brandSerif text-[clamp(32px,4vw,46px)] font-normal leading-[1.05]">
              {tempo("title")} <em className="text-brand-gold">{tempo("titleEm")}</em>
            </h3>
            <p className="max-w-[460px] text-[15px] leading-relaxed text-brand-muted">{tempo("body")}</p>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-3 rounded-2xl bg-brand-ink p-5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">{tempo("attackLabel")}</span>
                <span className="font-medium text-brand-gold">{tempo("attackValue")}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-3 flex-1 rounded-[3px] bg-brand-gold" />
                <span className="h-3 flex-1 rounded-[3px] bg-brand-gold" />
                <span className="h-3 flex-1 rounded-[3px] bg-brand-bad" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                <span className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
              </div>
              <span className="text-[13px] text-brand-muted">{tempo("attackNote", { move: "Rf6" })}</span>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-brand-ink p-5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">{tempo("defenseLabel")}</span>
                <span className="font-medium">{tempo("defenseValue")}</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="h-3 flex-1 rounded-[3px] bg-brand-cream" />
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className="h-3 flex-1 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(242,237,227,0.25)]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

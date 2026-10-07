import { getTranslations } from "next-intl/server";

interface StatCard {
  label: string;
  value: string;
  sub: string;
  body: string;
}

interface Feature {
  title: string;
  body: string;
}

export async function ProgressionSection() {
  const t = await getTranslations("Marketing.progression");
  const cards = t.raw("cards") as StatCard[];
  const features = t.raw("features") as Feature[];

  return (
    <section id="progression" className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-16 sm:px-10 sm:py-28">
      <div className="flex max-w-[760px] flex-col gap-[18px]">
        <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-gold">{t("kicker")}</span>
        <h2 className="text-balance font-brandSerif text-[clamp(40px,5.5vw,68px)] font-normal leading-none tracking-tight">
          {t("title")} <em className="text-brand-gold">{t("titleEm")}</em>
        </h2>
        <p className="max-w-[600px] text-base leading-relaxed text-brand-muted">{t("body")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-3 rounded-[22px] border border-white/[0.08] bg-brand-panel p-[26px]">
            <span className="font-brandMono text-[11px] uppercase tracking-[0.12em] text-brand-muted">{card.label}</span>
            {card.value && (
              <div className="flex items-baseline gap-2.5">
                <span className="font-brandSerif text-[52px] leading-none">{card.value}</span>
                {card.sub && <span className="text-sm text-brand-good">{card.sub}</span>}
              </div>
            )}
            <p className="text-sm leading-relaxed text-brand-muted">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-[22px] border border-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className={`flex flex-col gap-2 p-6 ${i < features.length - 1 ? "border-b border-white/[0.08] sm:border-b-0 sm:border-r" : ""}`}
          >
            <span className="text-[15px] font-medium">{feature.title}</span>
            <span className="text-[13px] leading-relaxed text-brand-muted">{feature.body}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

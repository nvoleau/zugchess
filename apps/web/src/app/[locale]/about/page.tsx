import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Marketing.about");
  const session = await auth();
  const isAuthenticated = !!session?.user;

  const cards = [
    { title: t("card1Title"), body: t("card1Body") },
    { title: t("card2Title"), body: t("card2Body") },
    { title: t("card3Title"), body: t("card3Body") },
  ];

  return (
    <div className="dark min-h-screen bg-brand-ink font-brandSans text-brand-cream">
      <SiteHeader isAuthenticated={isAuthenticated} />

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
        {/* En-tête */}
        <div className="mb-16 max-w-3xl sm:mb-24">
          <Reveal delay={0}>
            <span className="mb-4 block font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">
              {t("kicker")}
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-brandDisplay text-[clamp(52px,7vw,96px)] font-normal leading-[0.97] tracking-tight">
              {t("title")} <em className="text-brand-accent">{t("titleEm")}</em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-brand-muted">{t("body")}</p>
          </Reveal>
        </div>

        {/* Trois valeurs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <div className="flex h-full flex-col gap-5 rounded-[22px] border border-white/[0.08] bg-brand-panel p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
                <span className="self-start rounded-full border border-white/[0.2] px-3 py-0.5 font-brandMono text-[13px] text-brand-muted">
                  0{i + 1}
                </span>
                <h2 className="text-xl font-medium">{card.title}</h2>
                <p className="text-[15px] leading-relaxed text-brand-muted">{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Closing statement */}
        <Reveal delay={0}>
          <div className="mt-10 rounded-[28px] border border-brand-accent/20 bg-brand-panel p-8 sm:p-12">
            <h2 className="font-brandDisplay text-[clamp(32px,4vw,48px)] font-normal leading-tight tracking-tight">
              {t("closingTitle")}
            </h2>
            <p className="mt-4 max-w-[580px] text-[15px] leading-relaxed text-brand-muted">
              {t("closingBody")}
            </p>
          </div>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}

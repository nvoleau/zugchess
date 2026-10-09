import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/ui/reveal";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Marketing.contact");
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className="dark min-h-screen bg-brand-ink font-brandSans text-brand-cream">
      <SiteHeader isAuthenticated={isAuthenticated} />

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">

          {/* En-tête */}
          <div className="flex flex-col gap-6">
            <Reveal delay={0}>
              <span className="block font-brandMono text-xs uppercase tracking-[0.14em] text-brand-accent">
                {t("kicker")}
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="font-brandDisplay text-[clamp(48px,6vw,80px)] font-normal leading-[0.97] tracking-tight">
                {t("title")} <em className="text-brand-accent">{t("titleEm")}</em>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="max-w-[440px] text-lg leading-relaxed text-brand-muted">{t("body")}</p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
                  {t("emailLabel")}
                </span>
                <a
                  href={`mailto:${t("emailAddress")}`}
                  className="text-brand-accent transition-opacity hover:opacity-80"
                >
                  {t("emailAddress")}
                </a>
              </div>
            </Reveal>
          </div>

          {/* Formulaire */}
          <Reveal delay={150}>
            <form className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
                  {t("formName")}
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  className="rounded-[14px] border border-white/[0.12] bg-brand-panel px-4 py-3 text-brand-cream outline-none transition-all placeholder:text-brand-muted/50 focus:border-brand-accent/60 focus:ring-1 focus:ring-brand-accent/30"
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
                  {t("formEmail")}
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="rounded-[14px] border border-white/[0.12] bg-brand-panel px-4 py-3 text-brand-cream outline-none transition-all placeholder:text-brand-muted/50 focus:border-brand-accent/60 focus:ring-1 focus:ring-brand-accent/30"
                  placeholder="jean@exemple.fr"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-brandMono text-xs uppercase tracking-[0.14em] text-brand-muted">
                  {t("formMessage")}
                </label>
                <textarea
                  name="message"
                  rows={5}
                  className="resize-none rounded-[14px] border border-white/[0.12] bg-brand-panel px-4 py-3 text-brand-cream outline-none transition-all placeholder:text-brand-muted/50 focus:border-brand-accent/60 focus:ring-1 focus:ring-brand-accent/30"
                  placeholder="…"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-[13px] text-brand-muted">{t("formNote")}</span>
                <button
                  type="submit"
                  className="rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-ink transition-all hover:bg-brand-accentHover hover:scale-[1.02] active:scale-[0.97]"
                >
                  {t("formCta")}
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

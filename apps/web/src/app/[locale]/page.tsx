import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { MethodSection } from "@/components/marketing/method-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProgrammeSection } from "@/components/marketing/programme-section";
import { ProgressionSection } from "@/components/marketing/progression-section";
import { QuoteSection } from "@/components/marketing/quote-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

// Le CTA du header dépend de la session (cookies) : jamais mis en cache statique.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="dark min-h-screen bg-brand-ink font-brandSans text-brand-cream">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <Hero isAuthenticated={isAuthenticated} />
      <QuoteSection />
      <MethodSection />
      <ProgrammeSection />
      <ProgressionSection />
      <PricingSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

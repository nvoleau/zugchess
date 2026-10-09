import { setRequestLocale } from "next-intl/server";
import { WaouhTrial } from "@/components/play/waouh-trial";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { auth } from "@/auth";

// Essai sans compte — ni Prisma ni session requise pour le jeu.
// Enveloppé dans le thème sombre identique à la marketing page.
export default async function TryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isFr = locale !== "en";

  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className="dark min-h-screen bg-brand-ink font-brandSans text-brand-cream">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="flex flex-col gap-6 text-center mb-8">
          <div>
            <p className="font-brandMono text-[10px] uppercase tracking-[0.14em] text-brand-gold mb-2">
              {isFr ? "Essai gratuit" : "Free trial"}
            </p>
            <h1 className="font-brandSerif text-2xl tracking-tight text-brand-cream">
              {isFr ? "Découvrez ce que vous ne saviez pas" : "Discover what you didn't know"}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {isFr
                ? "3 positions contre-intuitives. Pas de compte requis."
                : "3 counter-intuitive positions. No account required."}
            </p>
          </div>
        </div>
        <WaouhTrial />
      </main>
      <SiteFooter />
    </div>
  );
}

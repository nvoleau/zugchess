"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function PricingSection() {
  const t = useTranslations("Marketing.pricing");
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const freeFeatures = t.raw("free.features") as string[];
  const premiumFeatures = t.raw("premium.features") as string[];
  const price = billing === "annual" ? t("premium.priceAnnual") : t("premium.priceMonthly");
  const priceSub = billing === "annual" ? t("premium.priceAnnualSub") : t("premium.priceMonthlySub");
  const founderPrice = billing === "annual" ? t("founder.priceAnnual") : t("founder.priceMonthly");

  return (
    <section id="tarifs" className="border-t border-white/[0.08] bg-brand-panelAlt">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 py-16 sm:px-10 sm:py-28">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-brandSerif text-[clamp(40px,5.5vw,68px)] font-normal leading-none tracking-tight">{t("title")}</h2>
          <p className="text-base text-brand-muted">{t("subtitle")}</p>
          <div className="flex gap-1 rounded-full bg-[#1D1A14] p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2.5 text-sm ${billing === "monthly" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedLight"}`}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm ${billing === "annual" ? "bg-brand-gold text-brand-ink" : "text-brand-mutedLight"}`}
            >
              {t("annual")} <span className="text-xs font-semibold">{t("annualBadge")}</span>
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-[22px] rounded-3xl border border-white/[0.08] bg-brand-panel p-8 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.18]">
            <div className="flex flex-col gap-2">
              <span className="text-lg font-medium">{t("free.name")}</span>
              <div className="flex items-baseline gap-2">
                <span className="font-brandSerif text-[56px] leading-none">{t("free.price")}</span>
                <span className="text-sm text-brand-muted">{t("free.priceSub")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-brand-mutedLight">
              {freeFeatures.map((feature) => (
                <span key={feature}>· {feature}</span>
              ))}
            </div>
            <Link
              href="/login"
              className="mt-auto rounded-full border border-white/25 px-4 py-3.5 text-center text-[15px] text-brand-cream hover:border-brand-gold hover:text-brand-gold"
            >
              {t("free.cta")}
            </Link>
          </div>

          <div className="relative flex flex-col gap-[22px] rounded-3xl border border-brand-gold/45 bg-gradient-to-b from-[#221D12] to-brand-panel p-8 transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/70">
            <div className="flex flex-col gap-2">
              <span className="text-lg font-medium text-brand-gold">{t("premium.name")}</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-brandSerif text-[56px] leading-none">{price}</span>
                <span className="text-sm text-brand-muted">{priceSub}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-brand-mutedLight">
              {premiumFeatures.map((feature) => (
                <span key={feature}>· {feature}</span>
              ))}
            </div>
            <Link
              href="/login"
              className="mt-auto rounded-full bg-brand-gold px-4 py-3.5 text-center text-[15px] font-semibold text-brand-ink hover:bg-brand-goldHover"
            >
              {t("premium.cta")}
            </Link>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-5 rounded-[18px] border border-dashed border-brand-gold/40 px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-medium">{t("founder.title")}</span>
            <span className="text-[13px] text-brand-muted">{t("founder.body", { price: founderPrice })}</span>
          </div>
          <span className="text-[13px] text-brand-muted">{t("founder.note")}</span>
        </div>
      </div>
    </section>
  );
}

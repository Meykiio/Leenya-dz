import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useTranslation } from "react-i18next";

const plans = [
  {
    nameKey: "pricing.free",
    monthlyPrice: "0",
    annualPrice: "0",
    highlighted: false,
    featureKeys: [
      "pricing.free.feature1",
      "pricing.free.feature2",
      "pricing.free.feature3",
      "pricing.free.feature4",
      "pricing.free.feature5",
    ],
    ctaKey: "pricing.free.cta",
    ctaVariant: "outline" as const,
    subtitleKey: "pricing.free.subtitle",
  },
  {
    nameKey: "pricing.pro",
    monthlyPrice: "4 900",
    annualPrice: "49 000",
    highlighted: true,
    popular: true,
    featureKeys: [
      "pricing.pro.feature1",
      "pricing.pro.feature2",
      "pricing.pro.feature3",
      "pricing.pro.feature4",
      "pricing.pro.feature5",
      "pricing.pro.feature6",
      "pricing.pro.feature7",
    ],
    ctaKey: "pricing.pro.cta",
    ctaVariant: "default" as const,
    comingSoon: true,
  },
  {
    nameKey: "pricing.business",
    monthlyPrice: "8 900",
    annualPrice: "89 000",
    highlighted: false,
    featureKeys: [
      "pricing.business.feature1",
      "pricing.business.feature2",
      "pricing.business.feature3",
      "pricing.business.feature4",
      "pricing.business.feature5",
    ],
    ctaKey: "pricing.business.cta",
    ctaVariant: "outline" as const,
  },
];

const PricingSection = () => {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-28 px-6 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
      <div className="max-w-5xl mx-auto relative z-10">
        <Reveal>
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-[34px] font-bold text-foreground tracking-tight">
              {t("landing:pricing.title")}
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              {t("landing:pricing.subtitle")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-xs font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              {t("landing:pricing.monthly")}
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative h-5 w-10 rounded-full border border-border bg-muted transition-all duration-300 hover:border-[var(--accent)]/30"
            >
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground shadow-sm transition-all duration-300 ${
                  annual ? "translate-x-5 bg-accent rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              {t("landing:pricing.annual")}
            </span>
            {annual && (
              <span className="text-[11px] font-medium text-[var(--accent)]">
                {t("landing:pricing.discount")}
              </span>
            )}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, index) => (
            <Reveal key={plan.nameKey} delay={150 + index * 100}>
              <div
                className={`relative rounded-xl p-7 border transition-all duration-400 card-hover ${
                  plan.highlighted
                    ? "border-[var(--accent)] z-10 -mx-1 md:-my-2 md:px-8 md:py-9 bg-background hover:shadow-xl hover:shadow-[var(--accent)]/5"
                    : "border-border hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-[var(--accent)]/5"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-0.5 rounded-full border border-[var(--accent)]/30 text-[var(--accent)] bg-background shadow-sm shadow-[var(--accent)]/10 rtl:translate-x-1/2">
                    {t("landing:pricing.recommended")}
                  </span>
                )}

                <p className="text-[13px] font-medium text-muted-foreground">
                  {t("landing:" + plan.nameKey)}
                </p>

                <div className="mt-3 mb-5">
                  <span className="font-mono text-[32px] font-bold text-foreground" dir="ltr">
                    {annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  {plan.nameKey !== "pricing.free" && (
                    <span className="text-[13px] text-muted-foreground ms-1">
                      {annual ? t("landing:pricing.perYear") : t("landing:pricing.perMonth")}
                    </span>
                  )}
                </div>

                {plan.subtitleKey && (
                  <p className="text-[12px] text-muted-foreground/80 -mt-2 mb-4">
                    {t("landing:" + plan.subtitleKey)}
                  </p>
                )}

                <div className="h-px bg-border mb-5" />

                <ul className="space-y-2.5 mb-7">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-[var(--accent)] shrink-0" />
                      <span className="text-[13px] text-muted-foreground">
                        {t("landing:" + featureKey)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.comingSoon ? "outline" : plan.ctaVariant}
                  disabled={plan.comingSoon}
                  className={`w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    plan.highlighted ? "shadow-md shadow-[var(--accent)]/20" : ""
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <Link to="/login">{t("landing:" + plan.ctaKey)}</Link>
                </Button>
                {!plan.comingSoon && (
                  <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                    {plan.nameKey === "pricing.free" ? t("landing:pricing.noCard") : t("landing:pricing.cancelAnytime")}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

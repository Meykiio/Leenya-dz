import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useTranslation } from "react-i18next";

const plans = [
  {
    nameKey: "pricing.free",
    price: "0",
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
    isFree: true,
  },
  {
    nameKey: "pricing.paid",
    price: "1 990",
    highlighted: true,
    popular: true,
    featureKeys: [
      "pricing.paid.feature1",
      "pricing.paid.feature2",
      "pricing.paid.feature3",
      "pricing.paid.feature4",
      "pricing.paid.feature5",
      "pricing.paid.feature6",
    ],
    ctaKey: "pricing.paid.cta",
    ctaVariant: "default" as const,
    isFree: false,
  },
];

const PricingSection = () => {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="py-28 px-6 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
      <div className="max-w-4xl mx-auto relative z-10">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-2xl mx-auto">
          {plans.map((plan, index) => (
            <Reveal key={plan.nameKey} delay={150 + index * 100}>
              <div
                className={`relative rounded-xl p-7 border transition-all duration-400 card-hover ${
                  plan.highlighted
                    ? "border-[var(--accent)] z-10 md:px-8 md:py-9 bg-background hover:shadow-xl hover:shadow-[var(--accent)]/5"
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
                    {plan.price}
                  </span>
                  {!plan.isFree && (
                    <span className="text-[13px] text-muted-foreground ms-1">
                      {t("landing:pricing.perMonth")}
                    </span>
                  )}
                </div>

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
                  variant={plan.ctaVariant}
                  className={`w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    plan.highlighted ? "shadow-md shadow-[var(--accent)]/20" : ""
                  }`}
                >
                  <Link to="/login">{t("landing:" + plan.ctaKey)}</Link>
                </Button>
                {plan.isFree && (
                  <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                    {t("landing:pricing.noCard")}
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

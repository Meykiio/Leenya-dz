import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
    <section id="pricing" className="py-20 px-6 bg-[var(--bg-dim)] relative overflow-hidden border-t border-[var(--outline)]">
      <div className="max-w-4xl mx-auto relative z-10">
        <Reveal>
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-display text-[28px] font-extrabold text-foreground tracking-[-0.02em]">
              {t("landing:pricing.title")}
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] mt-2">
              {t("landing:pricing.subtitle")}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start max-w-2xl mx-auto">
          {plans.map((plan, index) => (
            <Reveal key={plan.nameKey} delay={150 + index * 100}>
              <div
                className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-med hover:-translate-y-[3px] hover:shadow-md ${
                  plan.highlighted
                    ? "border-primary z-10"
                    : "border-[var(--border-default)]"
                }`}
              >
                {plan.popular && (
                  <span className="inline-flex items-center gap-1 self-start rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-primary-foreground mb-4">
                    {t("landing:pricing.recommended")}
                  </span>
                )}

                <p className="font-display text-[16px] font-bold text-primary">
                  {t("landing:" + plan.nameKey)}
                </p>

                <div className="mt-1.5 mb-5 flex items-baseline gap-1.5">
                  <span className="font-mono text-[28px] font-medium text-foreground tracking-[-0.02em]" dir="ltr">
                    {plan.price}
                  </span>
                  {!plan.isFree && (
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {t("landing:pricing.perMonth")}
                    </span>
                  )}
                </div>

                <ul className="flex-1 mb-7">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-center gap-2 border-b border-[var(--border-default)] py-1.5 last:border-b-0">
                      <span className="h-[5px] w-[5px] rounded-full bg-[var(--success)] shrink-0" />
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {t("landing:" + featureKey)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.ctaVariant}
                  className="w-full h-11"
                >
                  <Link to="/login">{t("landing:" + plan.ctaKey)}</Link>
                </Button>
                {plan.isFree && (
                  <p className="text-[10px] text-[var(--text-secondary)] text-center mt-2">
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
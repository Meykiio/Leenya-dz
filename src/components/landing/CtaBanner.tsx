import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/Reveal";
import { Shield, Clock, CreditCard, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const trustSignals = [
  { icon: CreditCard, key: "ctaBanner.noCard" },
  { icon: Clock, key: "ctaBanner.readyIn5" },
  { icon: Shield, key: "ctaBanner.noCommitment" },
];

const CtaBanner = () => {
  const { t } = useTranslation();
  return (
    <section className="py-[88px] px-6 bg-[var(--bg-dim)] border-t border-[var(--outline)] relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none" aria-hidden="true" />
      <div className="max-w-5xl mx-auto relative z-10">
        <Reveal>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--signal)] mb-2">
                {t("landing:ctaBanner.label")}
              </p>
              <h2 className="font-display text-[30px] font-extrabold text-foreground tracking-[-0.02em]">
                {t("landing:ctaBanner.title")}
              </h2>
              <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-sm">
                {t("landing:ctaBanner.description")}
              </p>

              <div className="flex flex-wrap gap-4 mt-4">
                {trustSignals.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-[var(--text-secondary)]" />
                      <span className="text-[11px] text-[var(--text-secondary)]">{t("landing:" + s.key)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 text-[15px] group"
              >
                <Link to="/login">
                  {t("landing:hero.cta")}
                  <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform rtl:ml-0 rtl:mr-1.5 rtl:scale-x-[-1]" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-6 text-[15px]"
              >
                <a href="#how-it-works">{t("landing:hero.ctaSecondary")}</a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CtaBanner;
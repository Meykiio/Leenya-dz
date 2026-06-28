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
    <section className="py-24 px-6 bg-gradient-to-br from-[#2b2344] to-[#1a1630] relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-[0.04] pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">
        <Reveal>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">
                {t("landing:ctaBanner.label")}
              </p>
              <h2 className="text-[30px] font-bold text-white tracking-tight">
                {t("landing:ctaBanner.title")}
              </h2>
              <p className="mt-2 text-[15px] text-white/45 max-w-sm">
                {t("landing:ctaBanner.description")}
              </p>

              <div className="flex flex-wrap gap-4 mt-4">
                {trustSignals.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-white/30" />
                      <span className="text-[11px] text-white/40">{t("landing:" + s.key)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 bg-white text-[#0C0C0A] hover:bg-white/90 border-0 text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
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
                className="h-11 px-6 border-white/20 text-white bg-transparent hover:bg-white/10 text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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

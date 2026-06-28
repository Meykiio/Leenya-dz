import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, Share2, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

const steps = [
  {
    icon: UserPlus,
    titleKey: "howItWorks.step1.title",
    descKey: "howItWorks.step1.desc",
    detailKey: "howItWorks.step1.detail",
  },
  {
    icon: Share2,
    titleKey: "howItWorks.step2.title",
    descKey: "howItWorks.step2.desc",
    detailKey: "howItWorks.step2.detail",
  },
  {
    icon: LayoutDashboard,
    titleKey: "howItWorks.step3.title",
    descKey: "howItWorks.step3.desc",
    detailKey: "howItWorks.step3.detail",
  },
];

function StepCard({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [expanded, setExpanded] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="group bg-background rounded-xl border border-border p-6 card-hover cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center bg-background group-hover:border-accent/30 group-hover:bg-accent/5 transition-all duration-300">
              <Icon className="h-4 w-4 text-accent" />
            </div>
            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto h-4 w-4 rounded-full bg-accent border border-accent/20 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{index + 1}</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t("landing:" + step.titleKey)}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{t("landing:" + step.descKey)}</p>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-foreground/60 leading-relaxed mt-2 pt-2 border-t border-border"
              >
                {t("landing:" + step.detailKey)}
              </motion.p>
            )}
          </div>
          <div className="text-muted-foreground/40 text-xs mt-1">
            {expanded ? "−" : "+"}
          </div>
        </div>
      </div>
      {index < 2 && (
        <div className="hidden md:flex justify-center py-2">
          <svg width="2" height="24" viewBox="0 0 2 24" className="text-border">
            <line x1="1" y1="0" x2="1" y2="24" stroke="currentColor" strokeDasharray="4 3" strokeWidth="1" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

export default function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section id="how-it-works" className="py-20 px-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-[28px] font-bold text-foreground tracking-tight mb-3">
            {t("landing:howItWorks.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {t("landing:howItWorks.subtitle")}
          </p>
        </div>

        <div className="flex flex-col">
          {steps.map((step, index) => (
            <StepCard key={step.titleKey} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

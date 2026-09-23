import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, Share2, LayoutDashboard, Plus, Minus } from "lucide-react";
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
      transition={{ duration: 0.48, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="group bg-card rounded-2xl border border-[var(--border-default)] p-4 sm:p-6 transition-all duration-med hover:-translate-y-[3px] hover:shadow-md cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-[8px] border border-primary/20 flex items-center justify-center bg-[var(--accent-light)] transition-all duration-300">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto h-[18px] w-[18px] rounded-[2px] bg-primary flex items-center justify-center">
              <span className="font-mono text-[10px] font-medium text-primary-foreground">{index + 1}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[15px] font-bold text-foreground mb-1 tracking-[-0.015em] break-words">{t("landing:" + step.titleKey)}</h3>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed break-words">{t("landing:" + step.descKey)}</p>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-[14px] text-[var(--text-secondary)] leading-relaxed mt-2 pt-2 border-t border-[var(--border-default)] break-words"
              >
                {t("landing:" + step.detailKey)}
              </motion.p>
            )}
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t("landing:" + step.titleKey)}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 h-8 w-8 -mt-1 -me-1 flex items-center justify-center rounded-[5px] text-[var(--text-secondary)] hover:text-foreground hover:bg-[var(--bg-muted)] transition-colors"
          >
            {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {index < 2 && (
        <div className="hidden md:flex justify-center py-2">
          <svg width="2" height="24" viewBox="0 0 2 24" className="text-[var(--border-default)]">
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
    <section id="how-it-works" className="py-12 px-4 sm:px-6 bg-background relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12 px-2">
          <h2 className="font-display text-[28px] font-extrabold text-foreground tracking-[-0.02em] mb-3">
            {t("landing:howItWorks.title")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            {t("landing:howItWorks.subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:gap-0">
          {steps.map((step, index) => (
            <StepCard key={step.titleKey} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
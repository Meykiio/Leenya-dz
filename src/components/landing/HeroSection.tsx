import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import Magnetic from "./Magnetic";

/** @description Landing hero — the headline, value proposition, and primary calls to action with a staggered entrance. */
const HeroSection = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative min-h-[86vh] overflow-hidden flex flex-col bg-[var(--bg-dim)] border-b border-[var(--outline)]">
      {/* Departures-board stripe pattern — the design system hero signature */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-dot-grid" aria-hidden="true" />

      {/* Hero Content — flex-1 centers vertically */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10"
      >
        {/* Headline */}
        <motion.h1
          variants={item}
          className={`${language === 'ar' ? 'font-arabic' : 'font-display'} text-4xl sm:text-5xl lg:text-[66px] font-extrabold text-foreground leading-[1.02] tracking-[-0.025em] max-w-[900px] mb-6 text-center`}
        >
          {t("landing:hero.title")}
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={item}
          className="text-[17px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed max-w-[662px] mb-10 text-center"
        >
          {t("landing:hero.subtitle")}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-4">
          <Magnetic>
            <Link
              to="/login?mode=signup"
              className="inline-flex rounded-[5px] bg-primary px-7 py-3.5 text-primary-foreground font-bold text-[15px] font-display transition-shadow duration-150 hover:shadow-md active:scale-[0.97]"
            >
              {t("landing:hero.cta")}
            </Link>
          </Magnetic>
          <Magnetic strength={0.16}>
            <a
              href="#how-it-works"
              className="group inline-flex items-center gap-2 rounded-[5px] border border-[var(--outline-hi)] bg-transparent px-7 py-3.5 text-foreground font-semibold text-[15px] transition-colors duration-150 hover:bg-[var(--bg-overlay)]"
            >
              {t("landing:hero.ctaSecondary")}
              <ChevronDown className="h-4 w-4 transition-transform duration-150 group-hover:translate-y-0.5" />
            </a>
          </Magnetic>
        </motion.div>

        {/* Footnote */}
        <motion.p variants={item} className="text-xs text-[var(--text-secondary)] mt-6">
          {t("landing:hero.footnote")}
        </motion.p>
      </motion.div>
    </section>
  );
};

export default HeroSection;
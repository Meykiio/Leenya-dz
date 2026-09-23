import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Clock, Heart, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const cards = [
  {
    titleKey: "testimonials.card1.title",
    descKey: "testimonials.card1.desc",
    icon: Clock,
  },
  {
    titleKey: "testimonials.card2.title",
    descKey: "testimonials.card2.desc",
    icon: Heart,
  },
  {
    titleKey: "testimonials.card3.title",
    descKey: "testimonials.card3.desc",
    icon: Sparkles,
  },
];

function Card({
  card,
  index,
}: {
  card: (typeof cards)[number];
  index: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = card.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.48, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bg-card rounded-2xl border border-[var(--border-default)] p-6 h-full transition-all duration-med hover:-translate-y-[3px] hover:shadow-md">
        <div className="flex flex-col gap-5">
          <div className="w-11 h-11 rounded-[8px] border border-primary/20 flex items-center justify-center bg-[var(--accent-light)] shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[15px] font-bold text-foreground mb-3 tracking-[-0.015em]">{t("landing:" + card.titleKey)}</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t("landing:" + card.descKey)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TestimonialsSection() {
  const { t } = useTranslation();
  return (
    <section id="testimonials" className="py-12 px-6 bg-[var(--bg-dim)] border-y border-[var(--border-default)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-[28px] font-extrabold text-foreground tracking-[-0.02em]">{t("landing:testimonials.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {t("landing:testimonials.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <Card key={card.titleKey} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
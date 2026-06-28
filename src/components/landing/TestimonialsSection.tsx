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
      transition={{ duration: 0.5, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bg-background rounded-xl border border-border p-7 md:p-8 card-hover relative overflow-hidden h-full">
        <div
          className="absolute top-0 left-0 rtl:right-0 rtl:left-auto w-1 h-full"
          style={{ background: "var(--accent)" }}
        />

        <div className="flex flex-col gap-5">
          <div className="w-11 h-11 rounded-xl border border-accent/20 flex items-center justify-center bg-accent/5 shrink-0">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground mb-3">{t("landing:" + card.titleKey)}</h3>
            <p className="text-sm text-foreground/65 leading-relaxed">{t("landing:" + card.descKey)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TestimonialsSection() {
  const { t } = useTranslation();
  return (
    <section id="testimonials" className="py-20 px-6 bg-muted/30 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-[28px] font-bold text-foreground tracking-tight">{t("landing:testimonials.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("landing:testimonials.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card, index) => (
            <Card key={card.titleKey} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

const faqs = [
  { qKey: "faq.q1", aKey: "faq.a1" },
  { qKey: "faq.q2", aKey: "faq.a2" },
  { qKey: "faq.q3", aKey: "faq.a3" },
  { qKey: "faq.q4", aKey: "faq.a4" },
  { qKey: "faq.q5", aKey: "faq.a5" },
  { qKey: "faq.q6", aKey: "faq.a6" },
];

export default function FaqSection() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="py-12 px-6 bg-background">
      <div className="max-w-2xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="font-display text-[28px] font-extrabold text-foreground tracking-[-0.02em] mb-3">
            {t("landing:faq.title")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("landing:faq.subtitle")}
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                {t("landing:" + faq.qKey)}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {t("landing:" + faq.aKey)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
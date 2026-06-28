import { useEffect, useRef, useState } from "react";
import { Store, CalendarCheck, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!ref.current || counted.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 1500;
          const steps = 30;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-mono text-xl md:text-2xl font-bold text-foreground">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

const benefits = [
  { icon: Store, key: "socialProof.benefit1" },
  { icon: CalendarCheck, key: "socialProof.benefit2" },
  { icon: MapPin, key: "socialProof.benefit3" },
];

export default function SocialProofBar() {
  const { t } = useTranslation();
  return (
    <section className="py-12 px-6 border-b border-border bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.key} className="flex items-center justify-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">{t("landing:" + b.key)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

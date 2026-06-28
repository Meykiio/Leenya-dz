import { useTranslation } from "react-i18next";

const marqueeCards = [
  {
    titleKey: "marquee.bookings",
    lines: [
      { label: "Amira K.", time: "09:00", statusKey: "marquee.confirmed" },
      { label: "Sofiane B.", time: "10:00", statusKey: "marquee.confirmed" },
      { label: "Nadia M.", time: "14:00", statusKey: "marquee.confirmed" },
    ],
  },
  {
    titleKey: "marquee.queue",
    lines: [
      { label: "B-03", detailKey: "marquee.inProgress" },
      { label: "B-04", detailKey: "marquee.waiting" },
      { label: "B-05", detailKey: "marquee.waiting" },
    ],
  },
  {
    titleKey: "marquee.overview",
    metrics: [
      { labelKey: "marquee.bookings", value: "47", change: "+12%" },
      { labelKey: "marquee.queue", value: "8", change: "-3" },
      { labelKey: "marquee.revenue", value: "38.5k", change: "+8%" },
    ],
  },
  {
    titleKey: "marquee.schedule",
    bars: [35, 55, 40, 75, 50, 65, 45],
    days: ["L", "M", "M", "J", "V", "S", "D"],
  },
];

function Card({ card, className }: { card: (typeof marqueeCards)[number]; className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      className={`w-[260px] shrink-0 rounded-xl border border-white/[0.06] bg-[#141413] p-4 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-[var(--accent-xl)]" />
        <span className="text-[10px] font-medium text-white/30">{t("landing:" + card.titleKey)}</span>
      </div>

      {"metrics" in card && card.metrics ? (
        <div className="flex gap-2">
          {card.metrics.map((m) => (
            <div key={m.labelKey} className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2">
              <div className="text-[8px] text-white/30 mb-0.5">{t("landing:" + m.labelKey)}</div>
              <div className="text-xs font-semibold text-white/80 font-mono">{m.value}</div>
              <div className="text-[7px] text-[#36BC8B] mt-0.5">{m.change}</div>
            </div>
          ))}
        </div>
      ) : "bars" in card && card.bars ? (
        <div className="flex items-end gap-1 h-16">
          {card.bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 justify-end">
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${h}%`,
                  background: i === 4 ? "var(--accent)" : "rgba(99,102,241,0.18)",
                }}
              />
              <span className="text-[6px] text-white/15 font-mono">{card.days![i]}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {"lines" in card && card.lines?.map((line, i) => (
            <div
              key={i}
              className="flex items-center gap-2 h-7 rounded-md px-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {"time" in line ? (
                <>
                  <span className="font-mono text-[9px] text-white/25 w-8">{line.time}</span>
                  <span className="text-[10px] text-white/60 flex-1">{line.label}</span>
                  <span className="text-[7px] text-[#36BC8B]">●</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[10px] text-white/40 w-10">{line.label}</span>
                  <span className="text-[8px] text-white/25">{t("landing:" + line.detailKey)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarqueeSection() {
  return (
    <section className="py-24 overflow-hidden bg-background border-y border-border">
      <div className="flex gap-6 marquee-track">
        {[...Array(4)].map((_, setIdx) =>
          marqueeCards.map((card, i) => (
            <Card key={`${setIdx}-${i}`} card={card} />
          ))
        )}
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import Section from "@/components/dashboard/Section";

interface HeatmapData {
  [key: string]: number;
}

const dayLabelKeys = ["dashboard:analytics.sun", "dashboard:analytics.mon", "dashboard:analytics.tue", "dashboard:analytics.wed", "dashboard:analytics.thu", "dashboard:analytics.fri", "dashboard:analytics.sat"];
const hours = Array.from({ length: 13 }, (_, i) => i + 7);

const CHART_BLUE = "#2563EB";

export default function PeakHoursGrid({ data }: { data: HeatmapData }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...Object.values(data));

  const getIntensity = (count: number) => {
    if (count === 0) return "transparent";
    const ratio = count / max;
    if (ratio <= 0.25) return `${CHART_BLUE}40`;
    if (ratio <= 0.5) return `${CHART_BLUE}80`;
    if (ratio <= 0.75) return `${CHART_BLUE}C0`;
    return CHART_BLUE;
  };

  return (
    <Section title={t("dashboard:analytics.peakHours")}>
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `2.5rem repeat(7, 1fr)` }}>
          <div />
          {dayLabelKeys.map((d) => (
            <div key={d} className="text-center font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-muted-foreground py-1">
              {t(d)}
            </div>
          ))}
          {hours.map((hour) => (
            <>
              <div key={`l-${hour}`} className="font-mono text-[10px] text-muted-foreground py-1 text-right pr-1.5">
                {hour}h
              </div>
              {dayLabelKeys.map((_, dayIndex) => {
                const key = `${dayIndex}-${hour}`;
                const count = data[key] || 0;
                return (
                    <div
                        key={key}
                        className="relative group"
                        title={t("dashboard:analytics.peakHourTooltip", { day: t(dayLabelKeys[dayIndex]), hour, count })}
                      >
                        <div className="rounded-[2px] h-5 transition-colors" style={{ background: getIntensity(count) }} />
                    {count > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-white/80">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </Section>
  );
}
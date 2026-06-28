import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const metrics = [
  { labelKey: "features.demo.bookingLabel", value: "47", change: "+12%", up: true },
  { labelKey: "features.demo.queueTitle", value: "8", change: "-3", up: false },
  { labelKey: "features.demo.revenue", value: "38 500", change: "+8%", up: true },
];

const chartData = [35, 55, 40, 75, 50, 65, 45, 60, 48, 70, 52, 62];
const dayKeys = ["L", "M", "M", "J", "V", "S", "D", "L", "M", "M", "J", "V"];

export default function DashboardDemo() {
  const { t } = useTranslation();

  return (
    <div className="select-none pointer-events-auto min-h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-medium text-white/40">{t("landing:features.demo.overview")}</div>
        <span className="text-[8px] text-white/20">{t("landing:features.demo.week", { num: 3 })}</span>
      </div>

      <div className="flex gap-2 mb-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.labelKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5"
          >
            <div className="text-[8px] text-white/30 mb-1">{t("landing:" + m.labelKey)}</div>
            <div className="text-sm font-semibold text-white/80 font-mono">{m.value}</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {m.up ? (
                <TrendingUp className="h-2.5 w-2.5 text-accent" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5 text-white/30" />
              )}
              <span className={`text-[8px] ${m.up ? "text-accent" : "text-white/30"}`}>
                {m.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
        <div className="flex items-end gap-1 h-full">
          {chartData.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.03, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col items-center gap-0.5 justify-end"
            >
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: "100%",
                  background: i === 4 ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.18)",
                }}
              />
              <span className="text-[6px] text-white/15 font-mono">{dayKeys[i]}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

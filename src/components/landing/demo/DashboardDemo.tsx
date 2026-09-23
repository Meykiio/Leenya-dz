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
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A8BAD]">{t("landing:features.demo.overview")}</div>
        <span className="text-[8px] text-[#5A6C90]">{t("landing:features.demo.week", { num: 3 })}</span>
      </div>

      <div className="flex gap-2 mb-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.labelKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex-1 rounded-[8px] bg-white/[0.04] border border-[#263044] p-2.5"
          >
            <div className="text-[8px] text-[#7A8BAD] mb-1">{t("landing:" + m.labelKey)}</div>
            <div className="font-mono text-sm font-medium text-[#E8EEFF]">{m.value}</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {m.up ? (
                <TrendingUp className="h-2.5 w-2.5 text-[#10B981]" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5 text-[#7A8BAD]" />
              )}
              <span className={`font-mono text-[8px] ${m.up ? "text-[#10B981]" : "text-[#7A8BAD]"}`}>
                {m.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex-1 rounded-[8px] bg-white/[0.03] border border-[#263044] p-3">
        <div className="flex items-end gap-1 h-full">
          {chartData.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center gap-0.5 justify-end"
            >
              <div
                className="w-full rounded-t-[2px]"
                style={{
                  height: "100%",
                  background: i === 4 ? "#3B82F6" : "rgba(59,130,246,0.18)",
                }}
              />
              <span className="text-[6px] text-[#5A6C90] font-mono">{dayKeys[i]}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
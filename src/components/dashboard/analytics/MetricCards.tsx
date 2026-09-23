import { useTranslation } from "react-i18next";
import { CalendarDays, DollarSign, UserCheck, Star, Ticket, Clock } from "lucide-react";

interface MetricCardsProps {
  totalBookings: number;
  prevBookings: number;
  revenue: number;
  prevRevenue: number;
  conversionRate: number;
  prevConversionRate: number;
  avgRating: number | null;
  reviewCount: number;
  totalQueueTickets: number;
  prevQueueTickets: number;
  avgWaitTime: number;
  prevAvgWaitTime: number;
}

function pctChange(current: number, prev: number): string | null {
  if (prev === 0) return current > 0 ? "+100%" : null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export default function MetricCards({
  totalBookings, prevBookings, revenue, prevRevenue,
  conversionRate, prevConversionRate, avgRating, reviewCount,
  totalQueueTickets, prevQueueTickets, avgWaitTime, prevAvgWaitTime,
}: MetricCardsProps) {
  const { t } = useTranslation();
  const metrics = [
    {
      label: t("dashboard:analytics.bookings"),
      value: totalBookings,
      change: pctChange(totalBookings, prevBookings),
      icon: CalendarDays,
      color: "var(--primary)",
      bgColor: "var(--primary)",
    },
    {
      label: t("dashboard:analytics.estimatedRevenue"),
      value: `${revenue.toLocaleString("fr-DZ")} DZD`,
      change: pctChange(revenue, prevRevenue),
      icon: DollarSign,
      color: "var(--success)",
      bgColor: "var(--success)",
    },
    {
      label: t("dashboard:analytics.conversionRate"),
      value: `${conversionRate.toFixed(0)}%`,
      change: pctChange(conversionRate, prevConversionRate),
      icon: UserCheck,
      color: "var(--info)",
      bgColor: "var(--info)",
    },
    {
      label: t("dashboard:analytics.avgRating"),
      value: avgRating !== null ? `${avgRating.toFixed(1)}` : "—",
      change: t("dashboard:analytics.reviewCount", { count: reviewCount }),
      icon: Star,
      color: "var(--warning)",
      bgColor: "var(--warning)",
    },
    {
      label: t("dashboard:analytics.queueTickets"),
      value: totalQueueTickets,
      change: pctChange(totalQueueTickets, prevQueueTickets),
      icon: Ticket,
      color: "var(--accent)",
      bgColor: "var(--accent)",
    },
    {
      label: t("dashboard:analytics.avgWaitTime"),
      value: `${avgWaitTime} min`,
      change: pctChange(avgWaitTime, prevAvgWaitTime),
      icon: Clock,
      color: "var(--text-secondary)",
      bgColor: "var(--bg-muted)",
      invertChange: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-[var(--border-default)] rounded-2xl overflow-hidden border border-[var(--border-default)]">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div
              className="rounded-[8px] p-1.5"
              style={{ backgroundColor: `${m.bgColor}15` }}
            >
              <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
            </div>
            {m.change && (
              <span className={`font-mono text-[10px] font-medium ${
                m.invertChange
                  ? m.change.startsWith("+") ? "text-[var(--error)]" : "text-[var(--success)]"
                  : m.change.startsWith("+") ? "text-[var(--success)]" : m.change.startsWith("-") ? "text-[var(--error)]" : "text-muted-foreground"
              }`}>
                {m.change}
              </span>
            )}
          </div>
          <p className="font-mono text-[20px] font-medium tracking-[-0.02em] text-foreground">{m.value}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mt-0.5">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
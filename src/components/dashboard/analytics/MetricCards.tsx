import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, DollarSign, UserX, Star } from "lucide-react";

interface MetricCardsProps {
  totalBookings: number;
  prevBookings: number;
  revenue: number;
  prevRevenue: number;
  noShowRate: number;
  prevNoShowRate: number;
  avgRating: number | null;
  reviewCount: number;
}

function pctChange(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - prev) / prev) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

export default function MetricCards({
  totalBookings, prevBookings, revenue, prevRevenue,
  noShowRate, prevNoShowRate, avgRating, reviewCount,
}: MetricCardsProps) {
  const metrics = [
    {
      label: "Total réservations",
      value: totalBookings,
      change: pctChange(totalBookings, prevBookings),
      icon: CalendarDays,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Revenus estimés",
      value: `${revenue.toLocaleString("fr-DZ")} DZD`,
      change: pctChange(revenue, prevRevenue),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Taux de no-show",
      value: `${noShowRate.toFixed(1)}%`,
      change: pctChange(noShowRate, prevNoShowRate),
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      invertChange: true,
    },
    {
      label: "Note moyenne",
      value: avgRating !== null ? `⭐ ${avgRating.toFixed(1)}` : "—",
      change: `${reviewCount} avis`,
      icon: Star,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`rounded-lg p-2 ${m.bgColor}`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <span className={`text-xs font-medium ${
                m.invertChange
                  ? m.change.startsWith("+") ? "text-destructive" : "text-success"
                  : m.change.startsWith("+") ? "text-success" : m.change.startsWith("-") ? "text-destructive" : "text-muted-foreground"
              }`}>
                {m.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

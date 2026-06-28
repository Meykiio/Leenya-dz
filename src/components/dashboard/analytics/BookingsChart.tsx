import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingDay {
  date: string;
  completed: number;
  cancelled: number;
  noShow: number;
}

export default function BookingsChart({ data }: { data: BookingDay[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard:analytics.bookingsPerDay")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(parseISO(v), "dd/MM", { locale: fr })}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                labelFormatter={(v) => format(parseISO(v as string), "EEEE d MMM", { locale: fr })}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" name={t("dashboard:analytics.completed")} fill="#36BC8B" stackId="a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name={t("dashboard:analytics.cancelled")} fill="#EF5350" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="noShow" name={t("dashboard:analytics.noShow")} fill="#9CA3AF" stackId="a" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

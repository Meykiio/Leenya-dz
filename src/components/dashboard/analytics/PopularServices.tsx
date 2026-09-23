import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import Section from "@/components/dashboard/Section";

interface ServiceStat {
  name: string;
  bookings: number;
  tickets: number;
}

export default function PopularServices({ data }: { data: ServiceStat[] }) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return (
      <Section title={t("dashboard:analytics.popularServices")}>
        <p className="text-sm text-muted-foreground text-center py-8">{t("dashboard:analytics.noData")}</p>
      </Section>
    );
  }

  return (
    <Section title={t("dashboard:analytics.popularServices")}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="bookings" name={t("dashboard:analytics.bookings")} fill="#2563EB" radius={[0, 4, 4, 0]} />
            <Bar dataKey="tickets" name={t("dashboard:analytics.queue")} fill="#059669" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
}
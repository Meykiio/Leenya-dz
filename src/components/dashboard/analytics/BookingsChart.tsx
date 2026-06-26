import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingDay {
  date: string;
  completed: number;
  noShow: number;
}

export default function BookingsChart({ data }: { data: BookingDay[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Réservations par jour</CardTitle>
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
              <Bar dataKey="completed" name="Complétées" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="noShow" name="No-show" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

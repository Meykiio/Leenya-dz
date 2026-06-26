import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface QueueDay {
  date: string;
  joined: number;
  completed: number;
}

export default function QueueChart({ data }: { data: QueueDay[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">File d'attente par jour</CardTitle>
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
              <Bar dataKey="joined" name="Nouveaux tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Servis" fill="#187A4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

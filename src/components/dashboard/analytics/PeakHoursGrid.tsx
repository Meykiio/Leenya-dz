import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapData {
  [key: string]: number; // "day-hour" → count
}

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7h–19h

export default function PeakHoursGrid({ data }: { data: HeatmapData }) {
  const max = Math.max(1, ...Object.values(data));

  const getOpacity = (count: number) => {
    if (count === 0) return "opacity-0";
    const ratio = count / max;
    if (ratio <= 0.25) return "opacity-25";
    if (ratio <= 0.5) return "opacity-50";
    if (ratio <= 0.75) return "opacity-75";
    return "opacity-100";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Heures de pointe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `3rem repeat(7, 1fr)` }}>
            {/* Header row */}
            <div />
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}

            {/* Hour rows */}
            {hours.map((hour) => (
              <>
                <div key={`label-${hour}`} className="text-xs text-muted-foreground py-1 text-right pr-2">
                  {hour}h
                </div>
                {dayLabels.map((_, dayIndex) => {
                  const key = `${dayIndex}-${hour}`;
                  const count = data[key] || 0;
                  return (
                    <div
                      key={key}
                      className="relative group"
                      title={`${dayLabels[dayIndex]} ${hour}h: ${count} réservations`}
                    >
                      <div className={`rounded h-6 bg-primary ${getOpacity(count)} transition-opacity`} />
                      {count > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-foreground/60">
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
      </CardContent>
    </Card>
  );
}

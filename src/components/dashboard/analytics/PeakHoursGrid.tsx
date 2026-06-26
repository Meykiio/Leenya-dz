import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapData {
  [key: string]: number;
}

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const hours = Array.from({ length: 13 }, (_, i) => i + 7);

export default function PeakHoursGrid({ data }: { data: HeatmapData }) {
  const max = Math.max(1, ...Object.values(data));

  const getIntensity = (count: number) => {
    if (count === 0) return "";
    const ratio = count / max;
    if (ratio <= 0.25) return "bg-primary/25";
    if (ratio <= 0.5) return "bg-primary/50";
    if (ratio <= 0.75) return "bg-primary/75";
    return "bg-primary";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Heures de pointe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `2.5rem repeat(7, 1fr)` }}>
            <div />
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {hours.map((hour) => (
              <>
                <div key={`l-${hour}`} className="text-[10px] text-muted-foreground py-1 text-right pr-1.5">
                  {hour}h
                </div>
                {dayLabels.map((_, dayIndex) => {
                  const key = `${dayIndex}-${hour}`;
                  const count = data[key] || 0;
                  return (
                    <div
                      key={key}
                      className="relative group"
                      title={`${dayLabels[dayIndex]} ${hour}h: ${count} activites`}
                    >
                      <div className={`rounded h-5 ${getIntensity(count)} transition-colors`} />
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
      </CardContent>
    </Card>
  );
}

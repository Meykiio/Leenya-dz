import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const dayNameKeys = ["settings.hours.sunday", "settings.hours.monday", "settings.hours.tuesday", "settings.hours.wednesday", "settings.hours.thursday", "settings.hours.friday", "settings.hours.saturday"];

interface DayHours {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string;
  closes_at: string;
}

const defaultHours: DayHours[] = dayNameKeys.map((_, i) => ({
  day_of_week: i,
  is_closed: i === 5, // Friday off by default
  opens_at: "08:00",
  closes_at: "18:00",
}));

export default function HoursTab({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [loading, setLoading] = useState(false);
  const [sameAll, setSameAll] = useState(false);

  useEffect(() => {
    const fetchHours = async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", businessId);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[HoursTab] failed to fetch hours:', error.message);
        toast({ 
          title: t("common:toast.error"), 
          description: t("common:toast.loadError"), 
          variant: "destructive" 
        });
        return;
      }
      
      if (data && data.length > 0) {
        const mapped = dayNameKeys.map((_, i) => {
          const existing = data.find((d) => d.day_of_week === i);
          return existing
            ? { day_of_week: i, is_closed: existing.is_closed ?? false, opens_at: existing.opens_at || "08:00", closes_at: existing.closes_at || "18:00" }
            : defaultHours[i];
        });
        setHours(mapped);
      }
    };
    
    fetchHours();
  }, [businessId, t]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateDay = (index: number, field: keyof DayHours, value: any) => {
    setHours((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (sameAll && (field === "opens_at" || field === "closes_at" || field === "is_closed")) {
        return next.map((d) => ({ ...d, [field]: value }));
      }
      return next;
    });
  };

  const save = async () => {
    setLoading(true);
    // Delete existing and re-insert
    const { error: delError } = await supabase.from("business_hours").delete().eq("business_id", businessId);
    if (delError) { console.error("delete hours:", delError); setLoading(false); return; }
    const rows = hours.map((h) => ({
      business_id: businessId,
      day_of_week: h.day_of_week,
      is_closed: h.is_closed,
      opens_at: h.is_closed ? null : h.opens_at,
      closes_at: h.is_closed ? null : h.closes_at,
    }));
    const { error } = await supabase.from("business_hours").insert(rows);
    if (error) { console.error("save hours:", error); toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" }); }
    else toast({ title: t("dashboard:settings.hours.toast.saved") });
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("dashboard:settings.hours.title")}</CardTitle>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Switch checked={sameAll} onCheckedChange={setSameAll} />
              <span>{t("dashboard:settings.hours.sameForAll")}</span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hours.map((day, i) => (
            <div key={i} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <span className="w-24 text-sm font-medium text-foreground shrink-0">{t(`dashboard:${dayNameKeys[day.day_of_week]}`)}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!day.is_closed}
                  onCheckedChange={(v) => updateDay(i, "is_closed", !v)}
                />
                <span className="text-xs text-muted-foreground w-12">{day.is_closed ? t("dashboard:settings.hours.closed") : t("dashboard:settings.hours.open")}</span>
              </div>
              {!day.is_closed && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={day.opens_at}
                    onChange={(e) => updateDay(i, "opens_at", e.target.value)}
                    className="w-[100px] sm:w-28"
                  />
                  <span className="text-muted-foreground text-xs shrink-0">→</span>
                  <Input
                    type="time"
                    value={day.closes_at}
                    onChange={(e) => updateDay(i, "closes_at", e.target.value)}
                    className="w-[100px] sm:w-28"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Button onClick={save} disabled={loading} className="w-full sm:w-auto">
        {loading ? t("common:buttons.saving") : t("dashboard:settings.hours.save")}
      </Button>
    </div>
  );
}

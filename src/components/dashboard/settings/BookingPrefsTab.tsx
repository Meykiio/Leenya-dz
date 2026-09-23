import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import Section from "@/components/dashboard/Section";

export default function BookingPrefsTab({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    accepts_appointments: true,
    accepts_walkins: true,
    advance_booking_days: 14,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("accepts_appointments, accepts_walkins, advance_booking_days")
        .eq("id", businessId)
        .single();
      
      if (error) {
        if (import.meta.env.DEV) console.error('[BookingPrefsTab] failed to fetch prefs:', error.message);
        toast({ 
          title: t("common:toast.error"), 
          description: t("common:toast.loadError"), 
          variant: "destructive" 
        });
        return;
      }
      
      if (data) {
        setForm({
          accepts_appointments: data.accepts_appointments ?? true,
          accepts_walkins: data.accepts_walkins ?? true,
          advance_booking_days: data.advance_booking_days ?? 14,
        });
      }
    };
    
    fetchPrefs();
  }, [businessId, t]);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("businesses").update({
      accepts_appointments: form.accepts_appointments,
      accepts_walkins: form.accepts_walkins,
      advance_booking_days: form.advance_booking_days,
    }).eq("id", businessId);
    if (error) { console.error("save prefs:", error); toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" }); }
    else toast({ title: t("dashboard:settings.booking.toast.saved") });
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <Section title={t("dashboard:settings.booking.modes")}>
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("dashboard:settings.booking.online")}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t("dashboard:settings.booking.onlineDesc")}</p>
            </div>
            <Switch checked={form.accepts_appointments} onCheckedChange={(v) => setForm({ ...form, accepts_appointments: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t("dashboard:settings.booking.walkins")}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t("dashboard:settings.booking.walkinsDesc")}</p>
            </div>
            <Switch checked={form.accepts_walkins} onCheckedChange={(v) => setForm({ ...form, accepts_walkins: v })} />
          </div>
        </div>
      </Section>

      <Section title={t("dashboard:settings.booking.deadlines")}>
        <div className="space-y-2 max-w-lg">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t("dashboard:settings.booking.advanceDays", { days: form.advance_booking_days })}</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={form.advance_booking_days}
            onChange={(e) => setForm({ ...form, advance_booking_days: parseInt(e.target.value) || 14 })}
            className="w-32"
          />
        </div>
      </Section>

      <Button onClick={save} disabled={loading} className="w-full sm:w-auto">
        {loading ? t("common:buttons.saving") : t("dashboard:settings.booking.save")}
      </Button>
    </div>
  );
}
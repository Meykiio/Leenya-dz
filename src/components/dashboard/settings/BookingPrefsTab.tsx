import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export default function BookingPrefsTab({ businessId }: { businessId: string }) {
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
          title: "Erreur", 
          description: "Impossible de charger les préférences.", 
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
  }, [businessId]);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("businesses").update({
      accepts_appointments: form.accepts_appointments,
      accepts_walkins: form.accepts_walkins,
      advance_booking_days: form.advance_booking_days,
    }).eq("id", businessId);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Préférences enregistrées ✓" });
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Modes de réservation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Rendez-vous en ligne</p>
              <p className="text-xs text-muted-foreground">Les clients peuvent réserver depuis votre page</p>
            </div>
            <Switch checked={form.accepts_appointments} onCheckedChange={(v) => setForm({ ...form, accepts_appointments: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Walk-ins (file d'attente)</p>
              <p className="text-xs text-muted-foreground">Les clients peuvent rejoindre la file sans rendez-vous</p>
            </div>
            <Switch checked={form.accepts_walkins} onCheckedChange={(v) => setForm({ ...form, accepts_walkins: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Délais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Réservation jusqu'à X jours à l'avance</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={form.advance_booking_days}
              onChange={(e) => setForm({ ...form, advance_booking_days: parseInt(e.target.value) || 14 })}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Enregistrement..." : "Enregistrer les préférences"}
      </Button>
    </div>
  );
}

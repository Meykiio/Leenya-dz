import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, GripVertical, Scissors } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Dashboard services — CRUD interface for managing business services.
 * Supports inline editing, toggling active state, deletion with conflict handling.
 * @returns The services management page JSX
 */
const DashboardServices = () => {
  const { t } = useTranslation();
  const { business } = useBusinessInfo();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", name_ar: "", duration_minutes: 30, price_dzd: 1000, is_active: true });

  const fetchServices = async () => {
    if (!business) return;
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .order("display_order");

    if (error) { console.error("fetchServices:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:services.errors.loadServices"), variant: "destructive" }); }
    setServices(data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchServices(); }, [business]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", name_ar: "", duration_minutes: 30, price_dzd: 1000, is_active: true });
    setShowForm(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, name_ar: s.name_ar || "", duration_minutes: s.duration_minutes, price_dzd: s.price_dzd || 0, is_active: s.is_active });
    setShowForm(true);
  };

  const saveService = async () => {
    if (!business || !form.name.trim()) {
      toast({ title: t("dashboard:labels.error"), description: t("dashboard:services.errors.nameRequired"), variant: "destructive" });
      return;
    }

    if (editing) {
      const { error } = await supabase.from("services").update({
        name: form.name.trim(), name_ar: form.name_ar.trim() || null,
        duration_minutes: form.duration_minutes, price_dzd: form.price_dzd, is_active: form.is_active,
      }).eq("business_id", business.id).eq("id", editing.id);
      if (error) { console.error("saveService update:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:services.errors.updateService"), variant: "destructive" }); return; }
      toast({ title: t("dashboard:services.updated") });
    } else {
      const { error } = await supabase.from("services").insert({
        business_id: business.id, name: form.name.trim(), name_ar: form.name_ar.trim() || null,
        duration_minutes: form.duration_minutes, price_dzd: form.price_dzd, is_active: form.is_active,
        display_order: services.length,
      });
      if (error) { console.error("saveService insert:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:services.errors.addService"), variant: "destructive" }); return; }
      toast({ title: t("dashboard:services.added") });
    }
    setShowForm(false);
    fetchServices();
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("business_id", business.id).eq("id", id);
    if (error) {
      const msg = error.message.includes("foreign key") || error.message.includes("violates")
        ? t("dashboard:services.errors.deleteHasBookings")
        : t("dashboard:services.errors.deleteService");
      console.error("deleteService:", error);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: t("dashboard:services.deleted") });
    fetchServices();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("services").update({ is_active: !current }).eq("business_id", business.id).eq("id", id);
    if (error) { console.error("toggleActive:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:services.errors.updateService"), variant: "destructive" }); }
    fetchServices();
  };

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("dashboard:services.title")}</h2>
          <Button size="sm" onClick={openNew} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> {t("dashboard:services.add")}</Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-default)] py-12 text-center">
            <Scissors className="h-7 w-7 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-tertiary)]">{t("dashboard:services.empty")}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("dashboard:services.emptyDesc")}</p>
            <Button onClick={openNew} variant="outline" size="sm" className="mt-3 text-xs">{t("dashboard:services.add")}</Button>
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] divide-y divide-[var(--border-subtle)]">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors">
                <GripVertical className="h-4 w-4 text-[var(--text-disabled)] shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.is_active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] line-through"}`}>{s.name}</p>
                  {s.name_ar && <p className="text-xs text-[var(--text-tertiary)] font-arabic">{s.name_ar}</p>}
                </div>
                <span className="font-mono text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] px-2 py-0.5 rounded shrink-0">
                  {s.duration_minutes} min
                </span>
                <span className="text-sm text-[var(--text-secondary)] shrink-0 w-20 text-right">
                  {(s.price_dzd || 0).toLocaleString()} DZD
                </span>
                <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s.id, s.is_active)} />
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="h-7 w-7 p-0 text-[var(--text-tertiary)]">
                  <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[var(--error)]"><Trash2 className="h-3 w-3" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("dashboard:services.deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("dashboard:services.deleteDesc", { serviceName: s.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteService(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common:buttons.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="relative w-full max-w-md rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{editing ? t("dashboard:services.edit") : t("dashboard:services.form.new")}</h3>
                <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-[var(--text-tertiary)]" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("dashboard:services.form.nameFr")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("dashboard:services.form.namePlaceholder")} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("dashboard:services.form.nameAr")}</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="قص الشعر" dir="rtl" className="font-arabic h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("dashboard:services.form.duration")}: <span className="font-mono">{form.duration_minutes}</span> min</Label>
                  <Slider value={[form.duration_minutes]} onValueChange={([v]) => setForm({ ...form, duration_minutes: v })} min={15} max={180} step={15} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("dashboard:services.form.price")}</Label>
                  <Input type="number" value={form.price_dzd} onChange={(e) => setForm({ ...form, price_dzd: parseInt(e.target.value) || 0 })} className="h-8 text-sm" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("dashboard:services.form.active")}</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
              <Button onClick={saveService} disabled={!form.name.trim()} className="w-full h-8 text-sm">
                {editing ? t("dashboard:common.save") : t("dashboard:common.add")}
              </Button>
            </div>
          </div>
        )}
      </div>
  );
};

export default DashboardServices;

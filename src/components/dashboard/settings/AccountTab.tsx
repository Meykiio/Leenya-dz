import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import Section from "@/components/dashboard/Section";

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground";

export default function AccountTab() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", preferred_lang: "en" });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, preferred_lang")
        .eq("id", user.id)
        .single();
      
      if (error) {
        if (import.meta.env.DEV) console.error('[AccountTab] failed to fetch profile:', error.message);
        toast({ 
          title: t("common:toast.error"), 
          description: t("common:toast.loadError"), 
          variant: "destructive" 
        });
        return;
      }
      
      if (data) {
        setForm({
          full_name: data.full_name || "",
          phone: data.phone || "",
          preferred_lang: data.preferred_lang || "fr",
        });
      }
    };
    
    fetchProfile();
  }, [user, t]);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      phone: form.phone || null,
      preferred_lang: form.preferred_lang,
    }).eq("id", user.id);
    if (error) { console.error("saveProfile:", error); toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" }); }
    else toast({ title: t("dashboard:settings.account.toast.updated") });
    setLoading(false);
  };

  const changePassword = async () => {
    if (password.length < 6) {
      toast({ title: t("dashboard:settings.account.error.passwordShort"), variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { console.error("changePassword:", error); toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" }); }
    else { toast({ title: t("dashboard:settings.account.toast.passwordChanged") }); setPassword(""); }
  };

  return (
    <div className="space-y-8">
      <Section title={t("dashboard:settings.account.personal")}>
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label className={labelClass}>{t("dashboard:settings.account.email")}</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t("dashboard:settings.account.name")}</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t("dashboard:settings.account.phone")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>{t("dashboard:settings.account.language")}</Label>
            <Select value={form.preferred_lang} onValueChange={(v) => { setForm({ ...form, preferred_lang: v }); setLanguage(v); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("common:languages.english")}</SelectItem>
                <SelectItem value="fr">{t("common:languages.french")}</SelectItem>
                <SelectItem value="ar">{t("common:languages.arabic")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={loading}>
            {loading ? t("common:buttons.saving") : t("dashboard:settings.account.save")}
          </Button>
        </div>
      </Section>

      <Section title={t("dashboard:settings.account.changePassword")}>
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label className={labelClass}>{t("dashboard:settings.account.newPassword")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button variant="outline" onClick={changePassword} disabled={!password}>{t("dashboard:settings.account.update")}</Button>
        </div>
      </Section>

      <section className="space-y-3">
        <div className="border-b border-[var(--error-border)] pb-2.5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.015em] text-[var(--error)]">{t("dashboard:settings.account.dangerZone")}</h3>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">{t("dashboard:settings.account.delete")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dashboard:settings.account.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dashboard:settings.account.deleteDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                const { error } = await supabase.rpc("delete_my_account");
                if (error) {
                  toast({ title: t("common:toast.error"), description: error.message, variant: "destructive" });
                  return;
                }
                toast({ title: t("dashboard:settings.account.toast.deleted") });
                await signOut();
                navigate("/");
              }} className="bg-[var(--error)] text-white">
                {t("dashboard:settings.account.confirmDelete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
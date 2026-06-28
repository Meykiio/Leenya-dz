import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function AccountTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setLanguage } = useLanguage();
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
  }, [user]);

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
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("dashboard:settings.account.personal")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("dashboard:settings.account.email")}</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard:settings.account.name")}</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard:settings.account.phone")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard:settings.account.language")}</Label>
            <Select value={form.preferred_lang} onValueChange={(v) => { setForm({ ...form, preferred_lang: v }); setLanguage(v); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("dashboard:settings.account.changePassword")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("dashboard:settings.account.newPassword")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button variant="outline" onClick={changePassword} disabled={!password}>{t("dashboard:settings.account.update")}</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">{t("dashboard:settings.account.dangerZone")}</CardTitle></CardHeader>
        <CardContent>
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
                <AlertDialogAction onClick={() => toast({ title: t("dashboard:settings.account.toast.contactSupport") })}>
                  {t("dashboard:settings.account.confirmDelete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

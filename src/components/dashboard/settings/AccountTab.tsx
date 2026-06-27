import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function AccountTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", preferred_lang: "fr" });
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
          title: "Erreur", 
          description: "Impossible de charger votre profil.", 
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
    if (error) { console.error("saveProfile:", error); toast({ title: "Erreur", description: "Impossible de mettre à jour votre profil.", variant: "destructive" }); }
    else toast({ title: "Profil mis à jour ✓" });
    setLoading(false);
  };

  const changePassword = async () => {
    if (password.length < 6) {
      toast({ title: "Mot de passe trop court", description: "Minimum 6 caractères", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { console.error("changePassword:", error); toast({ title: "Erreur", description: "Impossible de changer le mot de passe.", variant: "destructive" }); }
    else { toast({ title: "Mot de passe modifié ✓" }); setPassword(""); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Informations personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Langue préférée</Label>
            <Select value={form.preferred_lang} onValueChange={(v) => setForm({ ...form, preferred_lang: v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveProfile} disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Changer le mot de passe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button variant="outline" onClick={changePassword} disabled={!password}>Mettre à jour</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">Zone dangereuse</CardTitle></CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Supprimer mon compte</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes vos données seront supprimées définitivement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast({ title: "Contactez le support pour supprimer votre compte." })}>
                  Confirmer la suppression
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

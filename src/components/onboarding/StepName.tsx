import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface StepNameProps {
  defaultName: string;
  onNext: (name: string) => void;
}

const StepName = ({ defaultName, onNext }: StepNameProps) => {
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Upsert profile via SECURITY DEFINER RPC (bypasses RLS)
      const { error: profileError } = await supabase
        .rpc("upsert_profile", { p_id: user.id, p_full_name: name.trim() });
      if (profileError) throw profileError;

      // Insert role via SECURITY DEFINER RPC (bypasses RLS)
      const { error: roleError } = await supabase
        .rpc("assign_owner_role", { p_user_id: user.id });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      onNext(name.trim());
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Bienvenue! Comment vous appelez-vous?
        </h2>
        <p className="text-muted-foreground mt-2">
          Ce nom sera utilisé dans votre profil professionnel
        </p>
      </div>

      <div className="space-y-2 max-w-sm mx-auto">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input
          id="fullName"
          placeholder="Votre nom complet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="text-lg h-12"
        />
      </div>

      <div className="flex justify-center">
        <Button type="submit" disabled={!name.trim() || loading} className="px-8">
          {loading ? "Enregistrement..." : "Continuer →"}
        </Button>
      </div>
    </form>
  );
};

export default StepName;

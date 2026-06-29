import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface StepNameProps {
  defaultName: string;
  onNext: (name: string) => void;
}

/** @description Onboarding step that captures the owner's full name, upserts the user profile and assigns the owner role via Supabase RPCs. */
const StepName = ({ defaultName, onNext }: StepNameProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth:onboarding.notAuthenticated"));

      // Upsert profile via SECURITY DEFINER RPC (bypasses RLS)
      const { error: profileError } = await supabase
        .rpc("upsert_profile", { p_id: user.id, p_full_name: name.trim() });
      if (profileError) throw profileError;

      // Insert role via SECURITY DEFINER RPC (bypasses RLS)
      const { error: roleError } = await supabase
        .rpc("assign_owner_role", { p_user_id: user.id });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      onNext(name.trim());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("onboarding create profile failed:", err);
      toast({ title: t("common:toast.error"), description: t("auth:onboarding.name.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t("auth:onboarding.name.title")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("auth:onboarding.name.subtitle")}
        </p>
      </div>

      <div className="space-y-2 max-w-sm mx-auto">
        <Label htmlFor="fullName">{t("auth:onboarding.name.label")}</Label>
        <Input
          id="fullName"
          placeholder={t("auth:onboarding.name.placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="text-lg h-12"
        />
      </div>

      <div className="flex justify-center">
        <Button type="submit" disabled={!name.trim() || loading} className="px-8">
          {loading ? t("common:buttons.saving") : t("auth:onboarding.continue") + " →"}
        </Button>
      </div>
    </form>
  );
};

export default StepName;

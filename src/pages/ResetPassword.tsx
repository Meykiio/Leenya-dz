import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

/** @description New-password page. Shows a spinner while the recovery session is detected, the form when the link is valid, and an expired-link notice when it is not. */
const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Check for recovery event (a valid recovery link fires this within milliseconds)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (timer) { clearTimeout(timer); timer = null; }
        setStatus("ready");
      }
    });
    // Fallback: if no recovery event arrives, the link is invalid or expired.
    // The guard keeps the timer from flipping an already-ready status to invalid.
    timer = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 7000);
    return () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: t("common:toast.error"), description: t("auth:resetPassword.passwordMismatch"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("auth:resetPassword.success"), description: t("auth:resetPassword.successDesc") });
      navigate("/login");
    } catch (err: unknown) {
      toast({ title: t("common:toast.error"), description: err instanceof Error ? err.message : t("common:toast.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-2xl font-bold text-foreground">{t("auth:resetPassword.invalidTitle")}</h1>
          <p className="text-muted-foreground">{t("auth:resetPassword.invalidDesc")}</p>
          <Button variant="outline" asChild>
            <Link to="/login">{t("auth:resetPassword.backToLogin")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {t("auth:resetPassword.title")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("auth:resetPassword.subtitle")}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">{t("auth:resetPassword.newPasswordLabel")}</Label>
              <Input id="new-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{t("auth:resetPassword.confirmLabel")}</Label>
              <Input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth:resetPassword.loading") : t("auth:resetPassword.submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword = ({ onBack }: ForgotPasswordProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: t("auth:forgotPassword.error"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">
          {t("auth:forgotPassword.title")}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          {t("auth:forgotPassword.subtitle")}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-[48px] h-[48px] rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-[14px] text-foreground">
              {t("auth:forgotPassword.emailSent")} <strong>{email}</strong>
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t("auth:forgotPassword.checkInbox")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-[13px]">{t("auth:forgotPassword.emailLabel")}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder={t("auth:forgotPassword.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-[44px]" disabled={loading}>
              {loading ? t("auth:forgotPassword.loading") : t("auth:forgotPassword.submit")}
            </Button>
          </form>
        )}

        <button
          onClick={onBack}
          className="flex items-center gap-1 mx-auto mt-4 text-[13px] text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" />
          {t("auth:forgotPassword.backToLogin")}
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;

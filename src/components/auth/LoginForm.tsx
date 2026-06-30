import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import ForgotPassword from "./ForgotPassword";

/** @description Email/password login and sign-up form with forgot-password flow, post-auth role-based redirection, and i18n support. */
const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { waitForRole } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  const handlePostAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use AuthContext's waitForRole (single RPC code path, no race with fetchRole)
    const roleData = await waitForRole();

    if (!roleData) {
      navigate("/onboarding");
      return;
    }

    if (roleData === "owner") {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!biz) {
        navigate("/onboarding");
        return;
      }
      navigate("/dashboard");
    } else if (roleData === "staff") {
      navigate("/staff");
    } else {
      navigate("/");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.session) {
          await handlePostAuth();
        } else {
          toast({
            title: t("auth:signup.emailSent"),
            description: t("auth:signup.emailSentDesc"),
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await handlePostAuth();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: t(isSignUp ? "auth:signup.error" : "auth:login.error"),
        description: err.message || t(isSignUp ? "auth:signup.error" : "auth:login.error"),
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
          Leenya
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          {t(isSignUp ? "auth:signup.title" : "auth:login.title")}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px]">{t(isSignUp ? "auth:signup.emailLabel" : "auth:login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete={isSignUp ? "email" : "username"}
                placeholder={t(isSignUp ? "auth:signup.emailPlaceholder" : "auth:login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px]">{t(isSignUp ? "auth:signup.passwordLabel" : "auth:login.passwordLabel")}</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[12px] text-primary hover:underline"
                  >
                    {t("auth:login.forgotPassword")}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-[44px]" disabled={loading}>
              {loading ? t(isSignUp ? "auth:signup.loading" : "auth:login.loading") : isSignUp ? t("auth:signup.submit") : t("auth:login.submit")}
            </Button>
          </form>

        <div className="mt-6 text-center text-[13px] text-muted-foreground">
          {isSignUp ? (
            <>
              {t("auth:signup.switchToLogin")}{" "}
              <button onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">
                {t("auth:signup.switchToLoginLink")}
              </button>
            </>
          ) : (
            <>
              {t("auth:login.switchToSignup")}{" "}
              <button onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">
                {t("auth:login.switchToSignupLink")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

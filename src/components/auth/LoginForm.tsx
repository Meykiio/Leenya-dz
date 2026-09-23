import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { waitForRole } = useAuth();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  const handlePostAuth = async () => {
    // Try getSession first (instant local read), fall back to getUser (network-verified)
    let user: import("@supabase/supabase-js").User | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      user = session.user;
    } else {
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u ?? undefined;
    }
    if (!user) return;

    // Return the user to the page they originally requested (set by ProtectedRoute).
    // Only allow same-origin in-app paths: must start with "/" and must not be protocol-relative ("//").
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
      navigate(from, { replace: true });
      return;
    }

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
        setIsSignUp(false);
        if (data?.session) {
          toast({
            title: t("auth:signup.accountCreated"),
            description: t("auth:signup.accountCreatedDesc"),
          });
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] bg-primary font-mono text-[19px] font-medium tracking-[-0.04em] text-primary-foreground">
          Ln
        </div>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-foreground">
          Leenya<span className="text-[var(--signal)]">.</span>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          {t(isSignUp ? "auth:signup.title" : "auth:login.title")}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t(isSignUp ? "auth:signup.emailLabel" : "auth:login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t(isSignUp ? "auth:signup.emailPlaceholder" : "auth:login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground/70">{t(isSignUp ? "auth:signup.emailHint" : "auth:login.emailHint")}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{t(isSignUp ? "auth:signup.passwordLabel" : "auth:login.passwordLabel")}</Label>
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
              <p className="text-[11px] text-muted-foreground/70">{t(isSignUp ? "auth:signup.passwordHint" : "auth:login.passwordHint")}</p>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
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
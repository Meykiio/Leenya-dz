import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import ForgotPassword from "./ForgotPassword";

const LoginForm = () => {
  const navigate = useNavigate();
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!roleData) {
      navigate("/onboarding");
      return;
    }

    if (roleData.role === "owner") {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .single();

      if (!biz) {
        navigate("/onboarding");
        return;
      }
      navigate("/dashboard");
    } else if (roleData.role === "staff") {
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
            title: "Vérifiez votre email",
            description: "Un lien de confirmation a été envoyé à votre adresse email.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await handlePostAuth();
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Une erreur est survenue",
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
          {isSignUp ? "Créez votre compte" : "Connectez-vous à votre compte"}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px]">Mot de passe</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[12px] text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-[44px]" disabled={loading}>
              {loading ? "Chargement..." : isSignUp ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>

        <div className="mt-6 text-center text-[13px] text-muted-foreground">
          {isSignUp ? (
            <>
              Déjà un compte ?{" "}
              <button onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">
                Se connecter
              </button>
            </>
          ) : (
            <>
              Nouveau sur Leenya ?{" "}
              <button onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">
                Créez votre compte gratuitement
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

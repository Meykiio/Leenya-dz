import { useState } from "react";
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
    } catch (err: any) {
      toast({
        title: "Erreur",
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
          Mot de passe oublié
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-[48px] h-[48px] rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-[14px] text-foreground">
              Email envoyé à <strong>{email}</strong>
            </p>
            <p className="text-[13px] text-muted-foreground">
              Vérifiez votre boîte de réception et suivez le lien.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-[13px]">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-[44px]" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </form>
        )}

        <button
          onClick={onBack}
          className="flex items-center gap-1 mx-auto mt-4 text-[13px] text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;

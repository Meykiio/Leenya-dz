import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, X, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const pricingPlans = [
  {
    name: "Gratuit",
    price: "0",
    features: ["30 réservations/mois", "1 membre d'équipe", "File d'attente basique"],
    current: true,
  },
  {
    name: "Pro",
    price: "2 990",
    features: ["Réservations illimitées", "5 membres d'équipe", "Rappels SMS", "Analytiques avancées"],
    highlight: true,
  },
  {
    name: "Business",
    price: "5 990",
    features: ["Tout de Pro", "Membres illimités", "Support prioritaire", "API personnalisée"],
  },
];

export default function SubscriptionTab({ businessId }: { businessId: string }) {
  const [bookingsThisMonth, setBookingsThisMonth] = useState<number | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const limit = 30;

  useEffect(() => {
    const fetchBookingsCount = async () => {
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("date", start);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[SubscriptionTab] failed to fetch bookings count:', error.message);
        toast({ 
          title: "Erreur", 
          description: "Impossible de charger les statistiques.", 
          variant: "destructive" 
        });
        setBookingsThisMonth(null);
      } else {
        setBookingsThisMonth(count || 0);
      }
    };
    
    fetchBookingsCount();
  }, [businessId]);

  const usagePct = bookingsThisMonth !== null ? Math.min(100, Math.round((bookingsThisMonth / limit) * 100)) : 0;
  const displayCount = bookingsThisMonth !== null ? bookingsThisMonth : "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Votre abonnement</CardTitle>
            <Badge variant="secondary" className="text-xs">Gratuit</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Réservations ce mois</span>
              <span className="font-medium text-foreground">{displayCount} / {limit}</span>
            </div>
            <Progress value={usagePct} className="h-2" />
          </div>
          {bookingsThisMonth !== null && usagePct >= 80 && (
            <p className="text-xs text-warning">⚠️ Vous approchez de la limite de votre forfait gratuit.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">Passez au Pro</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Réservations illimitées, rappels SMS, analytiques avancées et plus encore.
              </p>
              <Button className="mt-4" onClick={() => setShowPricingModal(true)}>
                Voir les forfaits
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique des factures</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune facture pour le moment.
          </p>
        </CardContent>
      </Card>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowPricingModal(false)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 space-y-6" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nos forfaits</h3>
              <button onClick={() => setShowPricingModal(false)}><X className="h-5 w-5 text-[var(--text-tertiary)]" /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-lg border p-4 space-y-3 ${
                    plan.highlight
                      ? "border-[var(--accent)] bg-[var(--accent-light)]"
                      : plan.current
                      ? "border-[var(--border-strong)] bg-[var(--bg-subtle)]"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[var(--text-primary)]">{plan.name}</h4>
                    {plan.current && (
                      <Badge variant="outline" className="text-[10px]">Actuel</Badge>
                    )}
                    {plan.highlight && (
                      <Badge className="text-[10px] bg-[var(--accent)]">Populaire</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {plan.price} <span className="text-sm font-normal text-[var(--text-tertiary)]">DZD/mois</span>
                  </p>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Check className="h-3 w-3 text-[var(--success)]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!plan.current && (
                    <Button 
                      variant={plan.highlight ? "default" : "outline"} 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        setShowPricingModal(false);
                        // Payment integration would go here
                      }}
                    >
                      Choisir
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-center text-[var(--text-tertiary)]">
              Les paiements seront disponibles prochainement. Contactez-nous pour un accès anticipé.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

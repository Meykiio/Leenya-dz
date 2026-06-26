import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const plans = [
{
  name: "Gratuit",
  price: "0",
  highlighted: false,
  features: [
  { text: "Jusqu'à 30 réservations/mois", included: true },
  { text: "1 membre du personnel", included: true },
  { text: "Page de réservation publique", included: true },
  { text: "Rappels SMS", included: false },
  { text: "Analytiques", included: false }]

},
{
  name: "Pro",
  price: "2 990",
  highlighted: true,
  features: [
  { text: "Réservations illimitées", included: true },
  { text: "5 membres du personnel", included: true },
  { text: "Rappels SMS automatiques", included: true },
  { text: "File d'attente en direct", included: true },
  { text: "Analytiques de base", included: true },
  { text: "Support prioritaire", included: true }]

},
{
  name: "Business",
  price: "5 990",
  highlighted: false,
  features: [
  { text: "Tout dans Pro", included: true },
  { text: "Personnel illimité", included: true },
  { text: "Multi-localisation", included: true },
  { text: "Intégration WhatsApp", included: true },
  { text: "Analytiques avancées", included: true },
  { text: "API access", included: true }]

}];


const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 px-6 bg-background">
      <div className="max-w-[880px] mx-auto">
        {/* Section Label */}
        <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-3.5 text-center">
          Tarifs
        </p>
        
        {/* Heading */}
        <h2 className="text-[34px] font-bold text-foreground tracking-tight text-center">
          Des tarifs simples.
        </h2>
        <p className="text-base text-muted-foreground mt-2 mb-14 text-center">
          Commencez gratuitement. Passez au Pro quand vous êtes prêt.
        </p>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) =>
          <div
            key={plan.name}
            className={`relative rounded-xl p-7 border ${
            plan.highlighted ?
            "border-primary border-[1.5px]" :
            "border-border"}`
            }>
            
              {/* Recommended Badge */}
              {plan.highlighted &&
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 border border-primary/30 text-primary text-[11px] font-semibold px-3 py-0.5 rounded-full bg-white">
                  Recommandé
                </span>
            }

              {/* Plan Name */}
              <p className="text-[13px] font-medium tracking-wide uppercase text-muted-foreground">
                {plan.name}
              </p>

              {/* Price */}
              <div className="mt-3 mb-5">
                <span className="font-mono text-[32px] font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-[15px] text-muted-foreground ml-1">
                  DZD/mois
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-border mb-5" />

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature) =>
              <li key={feature.text} className="flex items-start gap-2">
                    {feature.included ?
                <Check className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" /> :

                <X className="h-3.5 w-3.5 mt-0.5 text-border shrink-0" />
                }
                    <span
                  className={`text-[13px] ${
                  feature.included ? "text-muted-foreground" : "text-muted-foreground/50"}`
                  }>
                  
                      {feature.text}
                    </span>
                  </li>
              )}
              </ul>

              {/* CTA Button */}
              <Button
              asChild
              variant={plan.highlighted ? "default" : "outline"}
              className="w-full">
              
                <Link to="/login">
                  {plan.name === "Gratuit" ?
                "Commencer gratuitement" :
                plan.name === "Pro" ?
                "Essai gratuit 14 jours" :
                "Nous contacter"
                }
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>);

};

export default PricingSection;
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

interface StepBusinessTypeProps {
  defaultCategory?: BusinessCategory;
  onNext: (category: BusinessCategory) => void;
  onBack: () => void;
}

const categories: { value: BusinessCategory; label: string; emoji: string }[] = [
  { value: "beauty_salon", label: "Salon de beauté", emoji: "💅" },
  { value: "barbershop", label: "Barbershop", emoji: "✂️" },
  { value: "dental", label: "Dentiste", emoji: "🦷" },
  { value: "clinic", label: "Clinique / Cabinet", emoji: "🏥" },
  { value: "physiotherapy", label: "Kinésithérapie", emoji: "💆" },
  { value: "other", label: "Autre", emoji: "📦" },
];

const StepBusinessType = ({ defaultCategory, onNext, onBack }: StepBusinessTypeProps) => {
  const [selected, setSelected] = useState<BusinessCategory | undefined>(defaultCategory || "beauty_salon");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-[20px] font-bold text-foreground tracking-tight">
          Quel type d'entreprise gérez-vous ?
        </h2>
        <p className="text-[14px] text-muted-foreground mt-1.5">
          Cela nous aide à personnaliser votre expérience
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelected(cat.value)}
            className={`flex flex-col items-center gap-2 rounded-md border p-4 transition-all ${
              selected === cat.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/20 hover:bg-muted/50"
            }`}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className={`text-[13px] font-medium ${
              selected === cat.value ? "text-primary" : "text-foreground"
            }`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Retour
        </Button>
        <Button onClick={() => selected && onNext(selected)} disabled={!selected} className="px-8 h-[44px]">
          Continuer →
        </Button>
      </div>
    </div>
  );
};

export default StepBusinessType;

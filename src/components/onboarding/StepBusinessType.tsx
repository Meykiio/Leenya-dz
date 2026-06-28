import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

interface StepBusinessTypeProps {
  defaultCategory?: BusinessCategory;
  onNext: (category: BusinessCategory) => void;
  onBack: () => void;
}

const categories: { value: BusinessCategory; labelKey: string; emoji: string }[] = [
  { value: "beauty_salon", labelKey: "auth:onboarding.type.beautySalon", emoji: "💅" },
  { value: "barbershop", labelKey: "auth:onboarding.type.barbershop", emoji: "✂️" },
  { value: "dental", labelKey: "auth:onboarding.type.dental", emoji: "🦷" },
  { value: "clinic", labelKey: "auth:onboarding.type.clinic", emoji: "🏥" },
  { value: "physiotherapy", labelKey: "auth:onboarding.type.physiotherapy", emoji: "💆" },
  { value: "other", labelKey: "auth:onboarding.type.other", emoji: "📦" },
];

/** @description Onboarding step that lets the owner select their business category (beauty salon, barbershop, dental, clinic, etc.) from a grid of options. */
const StepBusinessType = ({ defaultCategory, onNext, onBack }: StepBusinessTypeProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<BusinessCategory | undefined>(defaultCategory || "beauty_salon");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-[20px] font-bold text-foreground tracking-tight">
          {t("auth:onboarding.businessTypeTitle")}
        </h2>
        <p className="text-[14px] text-muted-foreground mt-1.5">
          {t("auth:onboarding.businessTypeSubtitle")}
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
              {t(cat.labelKey)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          ← {t("auth:onboarding.back")}
        </Button>
        <Button onClick={() => selected && onNext(selected)} disabled={!selected} className="px-8 h-[44px]">
          {t("auth:onboarding.continue")} →
        </Button>
      </div>
    </div>
  );
};

export default StepBusinessType;

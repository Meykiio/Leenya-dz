import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { serviceSuggestions, type ServiceSuggestion } from "@/lib/serviceSuggestions";
import { Plus, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

interface StepServicesProps {
  businessId: string;
  category: BusinessCategory;
  slug: string;
  onComplete: (slug: string) => void;
  onBack: () => void;
}

interface ServiceItem extends ServiceSuggestion {
  id: string;
}

let idCounter = 0;
const makeId = () => `local-${++idCounter}`;

/** @description Onboarding step for adding services — shows category-based suggestions and allows custom service creation, then inserts them via Supabase RPC. */
const StepServices = ({ businessId, category, slug, onComplete, onBack }: StepServicesProps) => {
  const { t } = useTranslation();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDuration, setCustomDuration] = useState("30");
  const [customPrice, setCustomPrice] = useState("1000");

  const suggestions = serviceSuggestions[category] || serviceSuggestions.other;

  const addSuggestion = (s: ServiceSuggestion) => {
    if (services.some((sv) => sv.name === s.name)) return;
    setServices((prev) => [...prev, { ...s, id: makeId() }]);
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    setServices((prev) => [
      ...prev,
      { id: makeId(), name: customName.trim(), duration_minutes: parseInt(customDuration) || 30, price_dzd: parseInt(customPrice) || 0 },
    ]);
    setCustomName("");
    setCustomDuration("30");
    setCustomPrice("1000");
    setShowCustom(false);
  };

  const handleComplete = async () => {
    if (services.length === 0) return;
    setLoading(true);

    try {
      // Insert services via SECURITY DEFINER RPC (bypasses RLS)
      const { error } = await supabase
        .rpc("insert_services", {
          p_business_id: businessId,
          p_services: services.map((s, i) => ({
            name: s.name,
            duration_minutes: s.duration_minutes,
            price_dzd: s.price_dzd,
            display_order: i,
          })),
        });
      if (error) throw error;

      onComplete(slug);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("onboarding add services failed:", err);
      toast({ title: t("common:toast.error"), description: t("auth:onboarding.services.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground tracking-[-0.02em]">
          {t("auth:onboarding.services.title")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("auth:onboarding.services.subtitle")}
        </p>
      </div>

      {/* Suggestions */}
      <div className="max-w-lg mx-auto space-y-3">
        <p className="text-sm font-medium text-foreground">{t("auth:onboarding.services.suggested")}</p>
        <div className="space-y-2">
          {suggestions.map((s) => {
            const added = services.some((sv) => sv.name === s.name);
            return (
              <div
                key={s.name}
                className={`flex items-center justify-between rounded-[12px] border p-3 ${
                  added ? "border-primary/30 bg-[var(--accent-light)]" : "border-border bg-card"
                }`}
              >
                <div>
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {s.duration_minutes} min — {s.price_dzd.toLocaleString()} DZD
                  </span>
                </div>
                {added ? (
                  <Button size="sm" variant="ghost" onClick={() => {
                    const item = services.find((sv) => sv.name === s.name);
                    if (item) removeService(item.id);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => addSuggestion(s)}>
                    {t("auth:onboarding.add")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Added services */}
        {services.filter((s) => !suggestions.some((sg) => sg.name === s.name)).length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-foreground">{t("auth:onboarding.services.custom")}</p>
            {services
              .filter((s) => !suggestions.some((sg) => sg.name === s.name))
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-[12px] border border-primary/30 bg-[var(--accent-light)] p-3">
                  <div>
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {s.duration_minutes} min — {s.price_dzd.toLocaleString()} DZD
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeService(s.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        )}

        {/* Add custom */}
        {showCustom ? (
          <div className="rounded-[12px] border bg-card p-4 space-y-3">
            <Input placeholder={t("auth:onboarding.services.namePlaceholder")} value={customName} onChange={(e) => setCustomName(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder={t("auth:onboarding.services.durationPlaceholder")} type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} />
              <Input placeholder={t("auth:onboarding.services.pricePlaceholder")} type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addCustom} disabled={!customName.trim()}>{t("auth:onboarding.add")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>{t("auth:onboarding.cancel")}</Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> {t("auth:onboarding.services.customLink")}
          </button>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          ← {t("auth:onboarding.back")}
        </Button>
        <Button onClick={handleComplete} disabled={services.length === 0 || loading} className="px-8 h-11">
          {loading ? t("common:buttons.saving") : t("auth:onboarding.finishSetup")}
        </Button>
      </div>
    </div>
  );
};

export default StepServices;
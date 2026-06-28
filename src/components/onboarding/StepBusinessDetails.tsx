import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { wilayas } from "@/lib/wilayas";
import { generateSlug } from "@/lib/slugify";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

interface StepBusinessDetailsProps {
  category: BusinessCategory;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultData: any;
  onNext: (data: { businessName: string; businessPhone: string; address: string; wilayaCode: string; wilayaName: string; slug: string; businessId: string }) => void;
  onBack: () => void;
}

/** @description Onboarding step that collects business name, phone, address, and wilaya, creates the business record and default hours via Supabase RPC. */
const StepBusinessDetails = ({ category, defaultData, onNext, onBack }: StepBusinessDetailsProps) => {
  const { t } = useTranslation();
  const [businessName, setBusinessName] = useState(defaultData?.businessName || "");
  const [businessPhone, setBusinessPhone] = useState(defaultData?.businessPhone || "");
  const [address, setAddress] = useState(defaultData?.address || "");
  const [wilayaCode, setWilayaCode] = useState(defaultData?.wilayaCode || "");
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [showWilayaDropdown, setShowWilayaDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const slug = useMemo(() => (businessName ? generateSlug(businessName) : ""), [businessName]);

  const selectedWilaya = wilayas.find((w) => w.code === wilayaCode);

  const filteredWilayas = wilayas.filter((w) =>
    w.name.toLowerCase().includes(wilayaSearch.toLowerCase()) ||
    w.code.includes(wilayaSearch)
  );

  const isValid = businessName.trim() && businessPhone.trim() && address.trim() && wilayaCode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("auth:onboarding.notAuthenticated"));

      const wilaya = wilayas.find((w) => w.code === wilayaCode)!;

      // Upsert business + hours via SECURITY DEFINER RPC (bypasses RLS)
      const { data: biz, error: bizError } = await supabase
        .rpc("upsert_business", {
          p_owner_id: user.id,
          p_name: businessName.trim(),
          p_slug: slug,
          p_phone: businessPhone.trim(),
          p_address: address.trim(),
          p_wilaya_code: wilayaCode,
          p_wilaya_name: wilaya.name,
          p_category: category,
        });
      if (bizError) throw bizError;
      const bizId = biz as string;

      onNext({
        businessName: businessName.trim(),
        businessPhone: businessPhone.trim(),
        address: address.trim(),
        wilayaCode,
        wilayaName: wilaya.name,
        slug,
        businessId: bizId,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("onboarding create business failed:", err);
      toast({ title: t("common:toast.error"), description: t("auth:onboarding.errorCreateBusiness"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t("auth:onboarding.businessDetailsTitle")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("auth:onboarding.businessDetailsSubtitle")}
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="bizName">{t("auth:onboarding.businessNameLabel")}</Label>
          <Input
            id="bizName"
            placeholder={t("auth:onboarding.businessNamePlaceholder")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
          {slug && (
            <p className="text-xs text-muted-foreground">
              {t("auth:onboarding.yourLink")} <span className="font-mono text-primary">leenya.dz/{slug}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bizPhone">{t("auth:onboarding.phoneLabel")}</Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-md border bg-muted px-3 text-sm text-muted-foreground shrink-0">
              🇩🇿 +213
            </div>
            <Input
              id="bizPhone"
              type="tel"
              placeholder={t("auth:onboarding.phonePlaceholder")}
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t("auth:onboarding.addressLabel")}</Label>
          <Input
            id="address"
            placeholder={t("auth:onboarding.addressPlaceholder")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2 relative">
          <Label>{t("auth:onboarding.wilayaLabel")}</Label>
          <Input
            placeholder={t("auth:onboarding.wilayaPlaceholder")}
            value={showWilayaDropdown ? wilayaSearch : (selectedWilaya ? `${selectedWilaya.code} — ${selectedWilaya.name}` : "")}
            onChange={(e) => {
              setWilayaSearch(e.target.value);
              setShowWilayaDropdown(true);
            }}
            onFocus={() => {
              setShowWilayaDropdown(true);
              setWilayaSearch("");
            }}
            onBlur={() => setTimeout(() => setShowWilayaDropdown(false), 200)}
          />
          {showWilayaDropdown && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
              {filteredWilayas.map((w) => (
                <button
                  key={w.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setWilayaCode(w.code);
                    setShowWilayaDropdown(false);
                    setWilayaSearch("");
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                    wilayaCode === w.code ? "bg-primary/10 text-primary" : "text-popover-foreground"
                  }`}
                >
                  {w.code} — {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" type="button" onClick={onBack}>
          ← {t("auth:onboarding.back")}
        </Button>
        <Button type="submit" disabled={!isValid || loading} className="px-8">
          {loading ? t("common:buttons.saving") : t("auth:onboarding.continue") + " →"}
        </Button>
      </div>
    </form>
  );
};

export default StepBusinessDetails;

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StepName from "./StepName";
import StepBusinessType from "./StepBusinessType";
import StepBusinessDetails from "./StepBusinessDetails";
import StepServices from "./StepServices";
import WelcomeModal from "./WelcomeModal";
import type { Database } from "@/integrations/supabase/types";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

export interface OnboardingData {
  fullName: string;
  category: BusinessCategory;
  businessName: string;
  businessPhone: string;
  address: string;
  wilayaCode: string;
  wilayaName: string;
  slug: string;
  businessId: string;
}

/** @description Multi-step onboarding wizard that collects owner name, business category, business details, and services, then creates the business profile via Supabase RPCs. */
const OnboardingWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const STEPS = [t("auth:onboarding.stepName"), t("auth:onboarding.stepType"), t("auth:onboarding.stepDetails"), t("auth:onboarding.stepServices")];
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [showWelcome, setShowWelcome] = useState(false);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleComplete = (slug: string) => {
    setData((d) => ({ ...d, slug }));
    setShowWelcome(true);
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-4">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[15px] font-bold text-foreground tracking-tight">Leenya</h1>
            <span className="text-[13px] text-muted-foreground">
              {t("auth:onboarding.stepIndicator", { current: step + 1, total: STEPS.length })}
            </span>
          </div>

          {/* Dot-line progress indicator */}
          <div className="flex items-center justify-between px-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                {/* Dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-colors ${
                      i < step
                        ? "bg-foreground border-foreground"
                        : i === step
                        ? "bg-primary border-primary"
                        : "bg-background border-border"
                    }`}
                  />
                  <span className={`text-[10px] mt-1.5 whitespace-nowrap ${
                    i <= step ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}>
                    {label}
                  </span>
                </div>
                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[1px] mx-1.5 mt-[-14px] ${
                    i < step ? "bg-foreground" : "bg-border"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-[480px]">
          {step === 0 && (
            <StepName
              defaultName={data.fullName || ""}
              onNext={(name) => {
                setData((d) => ({ ...d, fullName: name }));
                goNext();
              }}
            />
          )}
          {step === 1 && (
            <StepBusinessType
              defaultCategory={data.category}
              onNext={(cat) => {
                setData((d) => ({ ...d, category: cat }));
                goNext();
              }}
              onBack={goBack}
            />
          )}
          {step === 2 && (
            <StepBusinessDetails
              category={data.category!}
              defaultData={data}
              onNext={(details) => {
                setData((d) => ({ ...d, ...details }));
                goNext();
              }}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <StepServices
              businessId={data.businessId!}
              category={data.category!}
              slug={data.slug!}
              onComplete={handleComplete}
              onBack={goBack}
            />
          )}
        </div>
      </div>

      {showWelcome && (
        <WelcomeModal
          slug={data.slug!}
          onClose={async () => {
            await refreshRole();
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default OnboardingWizard;

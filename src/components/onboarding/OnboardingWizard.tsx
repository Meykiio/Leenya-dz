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
    <div className="min-h-screen bg-[var(--bg-subtle)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-4">
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-foreground">
              Leenya<span className="text-[var(--signal)]">.</span>
            </h1>
            <span className="font-mono text-[12px] text-muted-foreground">
              {t("auth:onboarding.stepIndicator", { current: step + 1, total: STEPS.length })}
            </span>
          </div>

          {/* Numbered step rail */}
          <div className="flex items-center justify-between px-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-[5px] border flex items-center justify-center font-mono text-[11px] transition-colors ${
                      i < step
                        ? "bg-primary border-primary text-primary-foreground"
                        : i === step
                        ? "border-primary text-primary bg-[var(--bg-base)]"
                        : "border-[var(--border-default)] text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`mt-1.5 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.08em] ${
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {label}
                  </span>
                </div>
                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-1.5 mt-[-14px] ${
                    i < step ? "bg-primary" : "bg-[var(--border-default)]"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-[480px] rounded-2xl border bg-card p-6 shadow-sm">
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
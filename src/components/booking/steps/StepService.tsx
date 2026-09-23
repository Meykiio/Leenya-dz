import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_dzd: number | null;
}

interface Props {
  services: Service[];
  selectedService: Service | null;
  onSelect: (s: Service) => void;
  onContinue: () => void;
  loadingStaff: boolean;
}

/** @description Booking step for service selection — lists available services with duration and price, enables proceeding once a service is chosen. */
export default function StepService({ services, selectedService, onSelect, onContinue, loadingStaff }: Props) {
  const { t } = useTranslation();
  return (
    <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <h2 className="font-display text-[16px] font-bold text-foreground tracking-[-0.015em] mb-3.5">{t("booking:appointmentFlow.stepService.title")}</h2>
      <div className="flex flex-col gap-2">
        {services.map((s) => {
          const isSelected = selectedService?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={`flex items-center justify-between rounded-[12px] border p-[14px_16px] text-left transition-all ${
                isSelected
                  ? "border-primary bg-[var(--accent-light)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-muted/50"
              }`}
            >
              <div>
                <p className={`text-[14px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {s.name}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  <span className="font-mono">{s.duration_minutes}</span> min
                  {s.price_dzd != null && (
                    <> &middot; <span className="font-mono">{s.price_dzd.toLocaleString("fr-FR")}</span> DZD</>
                  )}
                </p>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 rtl:scale-x-[-1] ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      {selectedService && (
        <Button className="w-full mt-5 h-11" disabled={loadingStaff} onClick={onContinue}>
          {loadingStaff ? t("common:loading") : t("booking:appointmentFlow.stepService.continue")}
        </Button>
      )}
    </motion.div>
  );
}
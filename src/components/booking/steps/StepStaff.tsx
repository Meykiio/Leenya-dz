import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";

interface StaffMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  staffMembers: StaffMember[];
  selectedStaff: StaffMember | null | "no_preference";
  onSelect: (s: StaffMember | "no_preference") => void;
  onBack: () => void;
  onContinue: () => void;
}

/** @description Booking step for staff member selection — shows staff list with avatars and a "no preference" option for auto-assignment. */
export default function StepStaff({ staffMembers, selectedStaff, onSelect, onBack, onContinue }: Props) {
  const { t } = useTranslation();
  return (
    <motion.div key="staff" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" /> {t("common:buttons.back")}
      </button>
      <h2 className="font-display text-[16px] font-bold text-foreground tracking-[-0.015em] mb-3.5">{t("booking:appointmentFlow.stepStaff.title")}</h2>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onSelect("no_preference")}
          className={`flex items-center justify-between rounded-[12px] border p-[14px_16px] text-left transition-all ${
            selectedStaff === "no_preference"
              ? "border-primary bg-[var(--accent-light)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className={`text-[14px] font-medium ${selectedStaff === "no_preference" ? "text-primary" : "text-foreground"}`}>
                {t("booking:appointmentFlow.stepStaff.noPreference")}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t("booking:appointmentFlow.stepStaff.firstAvailable")}</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 shrink-0 rtl:scale-x-[-1] ${selectedStaff === "no_preference" ? "text-primary" : "text-muted-foreground"}`} />
        </button>
        {staffMembers.map((s) => {
          const isSelected = selectedStaff !== "no_preference" && selectedStaff?.id === s.id;
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
              <div className="flex items-center gap-3">
                <img
                  src={s.avatar_url || generatePixelAvatar(s.display_name, 40)}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <p className={`text-[14px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {s.display_name}
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 shrink-0 rtl:scale-x-[-1] ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <Button className="w-full mt-5 h-11" onClick={onContinue}>
        {t("common:buttons.continue")}
      </Button>
    </motion.div>
  );
}
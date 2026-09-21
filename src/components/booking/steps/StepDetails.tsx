import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_dzd: number | null;
}

interface StaffMember {
  id: string;
  display_name: string;
}

interface Props {
  onBack: () => void;
  name: string;
  phone: string;
  note: string;
  phoneError: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedStaff: StaffMember | null | "no_preference";
  onSubmit: () => void;
  submitting: boolean;
}

/** @description Booking step that collects client name, phone, and optional note, shows a summary of the selected service/date/staff, and submits the booking. */
export default function StepDetails({
  onBack, name, phone, note, phoneError,
  onNameChange, onPhoneChange, onNoteChange,
  selectedService, selectedDate, selectedTime, selectedStaff,
  onSubmit, submitting,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" /> {t("common:buttons.back")}
      </button>
      <h2 className="text-[15px] font-semibold text-foreground mb-3.5">{t("booking:appointmentFlow.stepDetails.title")}</h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="booking-name" className="text-[13px] font-medium text-foreground">{t("booking:appointmentFlow.stepDetails.nameLabel")}</label>
          <Input id="booking-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder={t("booking:appointmentFlow.stepDetails.namePlaceholder")} className="mt-1" />
        </div>
        <div>
          <label htmlFor="booking-phone" className="text-[13px] font-medium text-foreground">{t("booking:appointmentFlow.stepDetails.phoneLabel")}</label>
          <div className="flex gap-2 mt-1">
            <Input id="booking-phone" value={phone} onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))} placeholder="555 123 456" type="tel" />
          </div>
          {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
          {!phoneError && <p className="text-[11px] text-muted-foreground/70">{t("common:validation.phone.hint")}</p>}
        </div>
        <div>
          <label htmlFor="booking-note" className="text-[13px] font-medium text-foreground">{t("booking:appointmentFlow.stepDetails.noteLabel")}</label>
          <Textarea id="booking-note" value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder={t("booking:appointmentFlow.stepDetails.notePlaceholder")} rows={2} className="mt-1" />
        </div>
      </div>

      <div className="mt-5 rounded-md border border-border bg-muted/50 p-[14px_16px] space-y-1">
        <p className="text-[14px] font-medium text-foreground">{selectedService?.name}</p>
        <p className="text-[12px] text-muted-foreground">
          {selectedService?.price_dzd ? `${selectedService.price_dzd.toLocaleString("fr-FR")} DZD` : t("booking:appointmentFlow.stepDetails.priceOnRequest")}
        </p>
        <p className="text-[12px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {selectedDate && t("booking:appointmentFlow.dateTimeLine", {
            date: selectedDate.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" }),
            time: selectedTime,
          })}
        </p>
        {selectedStaff && selectedStaff !== "no_preference" && (
          <p className="text-[12px] text-muted-foreground">
            {t("booking:appointmentFlow.stepDetails.withStaff", { staffName: selectedStaff.display_name })}
          </p>
        )}
      </div>

      <Button
        className="w-full mt-5 h-[44px]"
        disabled={!name.trim() || !phone.trim() || submitting}
        onClick={onSubmit}
      >
        {submitting ? t("booking:appointmentFlow.stepDetails.submitting") : t("booking:appointmentFlow.stepDetails.submit")}
      </Button>
    </motion.div>
  );
}

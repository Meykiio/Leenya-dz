import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDateForDB, formatDateLabel, getDayOfWeek } from "@/lib/timeSlots";

interface BusinessHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean | null;
}

interface Props {
  dates: Date[];
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (d: Date) => void;
  onSelectTime: (t: string) => void;
  onBack: () => void;
  onContinue: () => void;
  businessHours: BusinessHour[];
  loadingSlots: boolean;
  slots: string[];
  hasStaffStep: boolean;
}

function isDayClosed(date: Date, businessHours: BusinessHour[]) {
  const h = businessHours.find((bh) => bh.day_of_week === getDayOfWeek(date));
  return !h || h.is_closed === true;
}

function isToday(date: Date) {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

/** @description Booking step for date and time selection — shows available dates and dynamically generated time slots based on business hours and existing bookings. */
export default function StepDateTime({
  dates, selectedDate, selectedTime, onSelectDate, onSelectTime,
  onBack, onContinue, businessHours, loadingSlots, slots, hasStaffStep,
}: Props) {
  const { t } = useTranslation();
  return (
    <motion.div key="datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4 rtl:scale-x-[-1]" /> {t("common:buttons.back")}
      </button>
      <h2 className="font-display text-[16px] font-bold text-foreground tracking-[-0.015em] mb-3.5">{t("booking:appointmentFlow.stepDateTime.titleDate")}</h2>

      <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {dates.map((d) => {
          const label = formatDateLabel(d);
          const closed = isDayClosed(d, businessHours);
          const dateSelected = selectedDate && formatDateForDB(d) === formatDateForDB(selectedDate);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              disabled={closed}
              onClick={() => { onSelectDate(d); }}
              className={`flex-shrink-0 flex flex-col items-center justify-center rounded-[8px] border min-w-[52px] h-[62px] transition-all ${
                closed ? "opacity-[0.35] cursor-not-allowed" : ""
              } ${
                dateSelected
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${
                dateSelected ? "text-primary-foreground/60" : today ? "text-primary" : "text-muted-foreground"
              }`}>
                {today ? t("booking:appointmentFlow.stepDateTime.today") : label.dayName}
              </span>
              <span className={`font-mono text-[18px] font-medium leading-tight ${
                dateSelected ? "text-primary-foreground" : "text-foreground"
              }`}>
                {label.dayNum}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4">
          <h3 className="font-display text-[16px] font-bold text-foreground tracking-[-0.015em] mb-3">{t("booking:appointmentFlow.stepDateTime.titleTime")}</h3>
          {loadingSlots ? (
            <p className="text-[13px] text-muted-foreground">{t("common:loading")}</p>
          ) : slots.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("booking:appointmentFlow.stepDateTime.noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => onSelectTime(slot)}
                  className={`h-[38px] rounded-[5px] text-[13px] font-mono font-medium transition-all ${
                    selectedTime === slot
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTime && (
        <Button className="w-full mt-5 h-11" onClick={onContinue}>
          {t("booking:appointmentFlow.stepService.continue")}
        </Button>
      )}
    </motion.div>
  );
}
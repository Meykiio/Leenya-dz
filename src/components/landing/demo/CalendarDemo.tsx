import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const slots = [
  "09:00", "10:00", "11:00", "14:00", "15:00", "16:00",
];

const preBooked: Record<string, string> = {
  "09:00": "Amira K.",
  "11:00": "Sofiane B.",
};

const days = ["mon", "tue", "wed", "thu", "fri", "sat"];

export default function CalendarDemo() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const handleClick = (slot: string) => {
    if (preBooked[slot]) return;
    setSelected(slot);
    setConfirmed(null);
    setTimeout(() => {
      setConfirmed(slot);
    }, 400);
  };

  return (
    <div className="select-none pointer-events-auto min-h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A8BAD]">{t("landing:features.demo.today")}</div>
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            {["#3B82F6", "#10B981", "#F59E0B"].map((c, i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-full border border-[#1A2235]"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 mb-3">
        {days.map((d) => (
          <div key={d} className="text-[8px] text-[#7A8BAD] font-medium text-center py-1">
            {t("landing:features.demo." + d)}
          </div>
        ))}
        {days.map((_, i) => (
          <div
            key={i}
            className={`h-6 rounded-[5px] text-[9px] flex items-center justify-center font-mono ${
              i === 2 ? "bg-[rgba(59,130,246,0.13)] text-[#3B82F6]" : "text-[#5A6C90]"
            }`}
          >
            {8 + i}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {slots.map((slot) => {
          const booked = preBooked[slot];
          const isSelected = selected === slot;
          const isConfirmed = confirmed === slot;

          return (
            <motion.button
              key={slot}
              onClick={() => handleClick(slot)}
              disabled={!!booked}
              className={`flex items-center gap-2 h-8 rounded-[5px] px-2.5 text-left transition-all duration-150 ${
                booked
                  ? "bg-white/[0.04] opacity-50 cursor-not-allowed"
                  : isConfirmed
                    ? "bg-[rgba(16,185,129,0.13)] border border-[rgba(16,185,129,0.3)]"
                    : isSelected
                      ? "bg-[rgba(59,130,246,0.13)] border border-[rgba(59,130,246,0.3)]"
                      : "bg-white/[0.03] border border-[#263044] hover:bg-white/[0.06]"
              }`}
              whileTap={{ scale: 0.97 }}
            >
              <span className="font-mono text-[9px] text-[#7A8BAD] w-9">{slot}</span>
              <span className={`text-[10px] flex-1 ${booked ? "text-[#7A8BAD]" : isConfirmed ? "text-[#10B981]" : isSelected ? "text-[#3B82F6]" : "text-[#7A8BAD]"}`}>
                {booked || (isConfirmed ? t("landing:features.demo.confirmed") : t("landing:features.demo.available"))}
              </span>
              {isConfirmed && <Check className="h-3 w-3 text-[#10B981]" />}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {confirmed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-2 text-[9px] text-center text-[#10B981] font-medium"
          >
            {t("landing:features.demo.appointmentConfirmed", { time: confirmed })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
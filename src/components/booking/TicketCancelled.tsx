import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  onBack: () => void;
}

export default function TicketCancelled({ onBack }: Props) {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-12 text-center space-y-3">
      <div className="w-[56px] h-[56px] rounded-full bg-[var(--error-bg)] border border-[var(--error-border)] flex items-center justify-center mx-auto">
        <span className="text-[var(--error)] text-xl">&#x2715;</span>
      </div>
      <h2 className="font-display text-[20px] font-bold text-foreground tracking-[-0.02em]">{t("booking:ticketCancelled.title")}</h2>
      <Button variant="outline" onClick={onBack} className="mt-2">{t("booking:ticketCancelled.back")}</Button>
    </div>
  );
}
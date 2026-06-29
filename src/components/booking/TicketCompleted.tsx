import { useTranslation } from "react-i18next";

export default function TicketCompleted() {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-12 text-center space-y-3">
      <div
        className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
      >
        <span style={{ color: 'var(--success)' }} className="text-xl">&#x2713;</span>
      </div>
      <h2 className="text-[20px] font-bold text-foreground">{t("booking:ticketCompleted.title")}</h2>
      <p className="text-[13px] text-muted-foreground">{t("booking:ticketCompleted.subtitle")}</p>
    </div>
  );
}

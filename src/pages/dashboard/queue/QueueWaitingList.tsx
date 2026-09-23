import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Play, XCircle, MessageCircle, Users2 } from "lucide-react";
import { openWhatsApp, buildQueueCalledUrl } from "@/lib/whatsapp";
import type { QueueTicket } from "@/types";

interface Props {
  tickets: QueueTicket[];
  businessName: string;
  onCall: (id: string) => void;
  onCancel: (id: string) => void;
  timeAgo: (date: string) => string;
}

export default function QueueWaitingList({ tickets, businessName, onCall, onCancel, timeAgo }: Props) {
  const { t } = useTranslation();
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] py-10 text-center">
        <Users2 className="h-6 w-6 text-[var(--text-secondary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)]">{t("dashboard:queue.emptyWaiting")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="flex items-center gap-3 rounded-[12px] border border-[var(--border-default)] bg-card p-3 hover:bg-[var(--bg-muted)] transition-colors">
          {ticket.checked_in_at && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)] text-[10px]" title={t("dashboard:queue.checkedIn")}>✓</span>
          )}
          <span className="font-mono text-[15px] font-medium text-[var(--text-primary)] shrink-0 w-14">{ticket.ticket_label}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{ticket.client_name}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {ticket.services?.name || "—"}
              {ticket.staff_members?.display_name && <> · {ticket.staff_members.display_name}</>}
              <span className="mx-1.5">·</span>{t("dashboard:queue.since")} {timeAgo(ticket.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => onCall(ticket.id)} className="gap-1 h-8 text-xs px-2.5">
              <Play className="h-3 w-3" /> {t("dashboard:queue.call")}
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => {
                const url = buildQueueCalledUrl(ticket.client_phone, businessName, ticket.ticket_label, ticket.services?.name || t("dashboard:queue.form.service"));
                openWhatsApp(url);
              }}
              title={t("dashboard:queue.tooltip.whatsapp")}
              className="text-[var(--text-secondary)] h-8 w-8 p-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-[var(--text-secondary)] h-8 w-8 p-0">
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("dashboard:queue.cancelTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("dashboard:queue.cancelDesc", { label: ticket.ticket_label, name: ticket.client_name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common:buttons.no")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancel(ticket.id)} className="bg-[var(--error)] text-white">{t("common:buttons.yes")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
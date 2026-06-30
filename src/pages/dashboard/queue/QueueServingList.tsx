import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, ArrowLeftFromLine, Users2 } from "lucide-react";
import type { QueueTicket } from "@/types";

interface Props {
  tickets: QueueTicket[];
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onSendBack?: (id: string) => void;
  timeAgo: (date: string) => string;
}

export default function QueueServingList({ tickets, onComplete, onNoShow, onSendBack, timeAgo }: Props) {
  const { t } = useTranslation();
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] py-10 text-center">
        <Users2 className="h-6 w-6 text-[var(--text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-tertiary)]">{t("dashboard:queue.emptyInService")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="border-l-[3px] border-l-[var(--accent)] bg-[var(--bg-subtle)] rounded-r-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xl font-bold text-[var(--text-primary)]">{ticket.ticket_label}</span>
              <p className="text-[13px] font-medium text-[var(--text-primary)] mt-1">{ticket.client_name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {ticket.services?.name || "—"} · {t("dashboard:queue.inServiceSince")} {ticket.called_at ? timeAgo(ticket.called_at) : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {ticket.status === "called" && onSendBack && (
              <Button
                size="sm" variant="ghost"
                onClick={() => onSendBack(ticket.id)}
                className="gap-1 text-xs"
                title={t("dashboard:queue.sendBack")}
              >
                <ArrowLeftFromLine className="h-3 w-3" /> {t("dashboard:queue.sendBack")}
              </Button>
            )}
            <Button
              size="sm" variant="outline"
              onClick={() => onComplete(ticket.id)}
              className="gap-1 text-xs bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)] hover:bg-[var(--success-bg)]"
            >
              <CheckCircle className="h-3 w-3" /> {t("dashboard:queue.complete")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm" variant="outline"
                  className="text-xs bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)] hover:bg-[var(--error-bg)]"
                >
                  {t("common:statuses.noShow")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("dashboard:queue.noShowTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("dashboard:queue.noShowDesc", { name: ticket.client_name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onNoShow(ticket.id)}>{t("common:buttons.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

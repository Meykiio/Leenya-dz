import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Users2 } from "lucide-react";
import type { QueueTicket } from "@/types";

interface Props {
  tickets: QueueTicket[];
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  timeAgo: (date: string) => string;
}

export default function QueueServingList({ tickets, onComplete, onNoShow, timeAgo }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] py-10 text-center">
        <Users2 className="h-6 w-6 text-[var(--text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-tertiary)]">Aucun client en service</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((t) => (
        <div key={t.id} className="border-l-[3px] border-l-[var(--accent)] bg-[var(--bg-subtle)] rounded-r-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-xl font-bold text-[var(--text-primary)]">{t.ticket_label}</span>
              <p className="text-[13px] font-medium text-[var(--text-primary)] mt-1">{t.client_name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t.services?.name || "—"} · En service depuis {t.called_at ? timeAgo(t.called_at) : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm" variant="outline"
              onClick={() => onComplete(t.id)}
              className="gap-1 text-xs bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)] hover:bg-[var(--success-bg)]"
            >
              <CheckCircle className="h-3 w-3" /> Terminer
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm" variant="outline"
                  className="text-xs bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)] hover:bg-[var(--error-bg)]"
                >
                  No-show
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Marquer comme no-show?</AlertDialogTitle>
                  <AlertDialogDescription>Le client {t.client_name} sera marqué comme absent.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onNoShow(t.id)}>Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

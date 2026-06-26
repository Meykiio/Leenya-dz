import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Play, XCircle, MessageCircle, Users2 } from "lucide-react";
import { buildQueueCalledUrl } from "@/lib/whatsapp";
import type { QueueTicket } from "@/types";

interface Props {
  tickets: QueueTicket[];
  businessName: string;
  onCall: (id: string) => void;
  onCancel: (id: string) => void;
  timeAgo: (date: string) => string;
}

export default function QueueWaitingList({ tickets, businessName, onCall, onCancel, timeAgo }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] py-10 text-center">
        <Users2 className="h-6 w-6 text-[var(--text-tertiary)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-tertiary)]">Aucun client en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tickets.map((t) => (
        <div key={t.id} className="flex items-center gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] p-3 hover:bg-[var(--bg-subtle)] transition-colors">
          <span className="font-mono text-[15px] font-semibold text-[var(--text-primary)] shrink-0 w-14">{t.ticket_label}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{t.services?.name || "—"} · depuis {timeAgo(t.created_at)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => onCall(t.id)} className="gap-1 h-[26px] text-xs px-2.5">
              <Play className="h-3 w-3" /> Appeler
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => {
                const url = buildQueueCalledUrl(t.client_phone, businessName, t.ticket_label, t.services?.name || "Service");
                window.open(url, "_blank");
              }}
              title="Envoyer WhatsApp"
              className="text-[var(--text-tertiary)] h-[26px] w-[26px] p-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-[var(--text-tertiary)] h-[26px] w-[26px] p-0">
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler ce ticket?</AlertDialogTitle>
                  <AlertDialogDescription>Le ticket {t.ticket_label} de {t.client_name} sera annulé.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Non</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancel(t.id)} className="bg-destructive text-destructive-foreground">Oui, annuler</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}

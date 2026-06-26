import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Bell } from "lucide-react";
import type { Booking } from "@/types";

interface Props {
  booking: Booking;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onArrived: (id: string) => void;
  onNoShow: (id: string) => void;
  onCancel: (id: string) => void;
  onReminder: (booking: Booking) => void;
  onWhatsApp: (booking: Booking) => void;
}

export default function BookingRow({ booking: b, statusColors, statusLabels, onAccept, onReject, onArrived, onNoShow, onCancel, onReminder, onWhatsApp }: Props) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-2 sm:gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors items-start sm:items-center">
      <span className="font-mono text-xs text-[var(--text-tertiary)]">
        {b.start_time?.slice(0, 5)} — {b.end_time?.slice(0, 5)}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{b.client_phone}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-[var(--text-secondary)]">{b.services?.name || "—"}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{b.staff_members?.display_name || "—"}</p>
      </div>
      <Badge variant="outline" className={`text-[11px] ${statusColors[b.status || "pending"]}`}>
        {statusLabels[b.status || "pending"]}
      </Badge>
      <div className="flex gap-1 flex-wrap">
        {b.status === "pending" && (
          <>
            <Button size="sm" variant="outline" onClick={() => onAccept(b.id)} className="h-7 text-xs px-2 text-[var(--success)] border-[var(--success-border)]">
              ✓ Accepter
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onReject(b.id)} className="h-7 text-xs px-2 text-[var(--error)]">
              ✕ Refuser
            </Button>
          </>
        )}
        {b.status === "confirmed" && (
          <Button size="sm" variant="outline" onClick={() => onArrived(b.id)} className="h-7 text-xs px-2">
            Déjà arrivé
          </Button>
        )}
        {b.status !== "completed" && b.status !== "cancelled" && b.status !== "no_show" && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[var(--error)]">No-show</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Marquer comme no-show?</AlertDialogTitle>
                  <AlertDialogDescription>{b.client_name} sera marqué(e) comme absent(e).</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Non</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onNoShow(b.id)}>Confirmer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-[var(--error)]">Annuler</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler cette réservation?</AlertDialogTitle>
                  <AlertDialogDescription>La réservation de {b.client_name} sera annulée.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Non</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancel(b.id)} className="bg-destructive text-destructive-foreground">Annuler la réservation</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => onWhatsApp(b)} title="WhatsApp" className="h-7 w-7 p-0">
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        {b.status !== "completed" && b.status !== "cancelled" && (
          <Button size="sm" variant="ghost" onClick={() => onReminder(b)} title="Rappel WhatsApp" className="h-7 w-7 p-0">
            <Bell className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

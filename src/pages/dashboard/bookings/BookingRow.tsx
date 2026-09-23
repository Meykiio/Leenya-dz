import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[80px_1fr_1fr_120px_minmax(300px,1fr)] gap-2 sm:gap-3 px-4 py-3 hover:bg-[var(--bg-muted)] transition-colors items-start sm:items-center">
      <span className="font-mono text-xs text-[var(--text-secondary)]">
        {b.start_time?.slice(0, 5)} — {b.end_time?.slice(0, 5)}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{b.client_phone}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-[var(--text-secondary)]">{b.services?.name || "—"}</p>
        <p className="text-xs text-[var(--text-secondary)]">{b.staff_members?.display_name || "—"}</p>
      </div>
      <Badge variant="outline" className={statusColors[b.status || "pending"]}>
        {statusLabels[b.status || "pending"]}
      </Badge>
      <div className="flex gap-1 flex-wrap">
        {b.status === "pending" && (
          <>
            <Button size="sm" onClick={() => onAccept(b.id)} className="h-8 text-xs px-2.5">
              {t("dashboard:bookings.accept")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onReject(b.id)} className="h-8 text-xs px-2 text-[var(--error)]">
              {t("dashboard:bookings.reject")}
            </Button>
          </>
        )}
        {b.status === "confirmed" && (
          <Button size="sm" variant="outline" onClick={() => onArrived(b.id)} className="h-8 text-xs px-2.5">
            {t("dashboard:bookings.arrived")}
          </Button>
        )}
        {b.status !== "completed" && b.status !== "cancelled" && b.status !== "no_show" && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-[var(--error)]">{t("common:statuses.noShow")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("dashboard:bookings.markNoShow")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("dashboard:bookings.markNoShowDesc", { name: b.client_name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common:buttons.no")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onNoShow(b.id)}>{t("common:buttons.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-[var(--error)]">{t("dashboard:bookings.cancel")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("dashboard:bookings.cancelConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("dashboard:bookings.cancelConfirmDesc", { name: b.client_name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common:buttons.no")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancel(b.id)} className="bg-[var(--error)] text-white">{t("dashboard:bookings.cancelBooking")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={() => onWhatsApp(b)} title={t("dashboard:queue.tooltip.whatsapp")} className="h-8 w-8 p-0">
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        {b.status !== "completed" && b.status !== "cancelled" && (
          <Button size="sm" variant="ghost" onClick={() => onReminder(b)} title={t("dashboard:bookings.tooltip.whatsapp")} className="h-8 w-8 p-0">
            <Bell className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
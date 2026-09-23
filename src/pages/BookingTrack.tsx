import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BookingData {
  id: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  businesses?: { name: string; address?: string };
  services?: { name: string };
}

/**
 * Booking tracker — allows customers to view and cancel their booking via a secure token.
 * Fetches booking details by token RPC and displays status, time, and location.
 * Subscribes to real-time changes so the page updates when staff changes the status.
 * @returns The booking tracking page JSX
 */
const BookingTrack = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setBookingId(null);
    supabase
      .rpc("get_booking_by_token", { p_token: token })
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          if (error) console.error("get_booking_by_token:", error);
          setBooking(null);
        } else {
          setBooking(data as BookingData);
          setBookingId(data.id);
        }
        setLoading(false);
      });
  }, [token]);

  // Refetch when the user returns to the page (staff may have changed the status meanwhile)
  useEffect(() => {
    if (!token) return;
    const refetch = async () => {
      const { data, error } = await supabase
        .rpc("get_booking_by_token", { p_token: token })
        .single();
      if (error || !data) return;
      setBooking(data as BookingData);
      setBookingId(data.id);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`booking-track-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<BookingData>;
          if (updated.status) {
            setBooking((prev) => prev ? { ...prev, status: updated.status! } : prev);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setReconnecting(true);
        if (status === "SUBSCRIBED") setReconnecting(false);
      });

    return () => { supabase.removeChannel(channel); };
  }, [bookingId, token]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    const { data: success, error } = await supabase
      .rpc("cancel_booking_by_token", {
        p_booking_id: booking.id,
        p_token: token,
      });

    if (error || !success) {
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
    } else {
      setBooking({ ...booking, status: "cancelled" });
      toast({ title: t("booking:bookingTrack.toast.cancelled") });
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-subtle)]">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-[var(--border-default)] p-5">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[var(--bg-subtle)]">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-[var(--border-default)] flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <XCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-[14px] text-muted-foreground">{t("booking:bookingTrack.notFound")}</p>
            <Button variant="outline" size="sm" asChild><Link to="/">{t("booking:bookingTrack.backToHome")}</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: t("common:statuses.pending"),
    confirmed: t("common:statuses.confirmed"),
    arrived: t("common:statuses.arrived"),
    in_service: t("common:statuses.inProgress"),
    completed: t("common:statuses.completed"),
    cancelled: t("common:statuses.cancelled"),
    no_show: t("common:statuses.noShow"),
  };
  const statusClasses: Record<string, string> = {
    pending: "badge-waiting",
    confirmed: "badge-confirmed",
    arrived: "badge-confirmed",
    in_service: "badge-in-service",
    completed: "badge-completed",
    cancelled: "badge-cancelled",
    no_show: "badge-no-show",
  };
  const statusLabel = statusLabels[booking.status] || statusLabels.pending;
  const statusClass = statusClasses[booking.status] || statusClasses.pending;
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-[var(--border-default)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-[var(--border-default)] px-5 h-[50px] flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5 rtl:scale-x-[-1]" />
          </Link>
          <h1 className="font-display text-[14px] font-bold text-foreground tracking-[-0.01em]">{t("booking:bookingTrack.title")}</h1>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + ref */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-mono text-muted-foreground">#{booking.id.slice(0, 8).toUpperCase()}</p>
            <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
          </div>

          {reconnecting && (
            <p className="text-[12px] text-[var(--warning)]" role="status">
              {t("booking:bookingTrack.reconnecting")}
            </p>
          )}

          {/* Details card */}
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-muted)] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-foreground">{booking.services?.name || "Service"}</p>
                <p className="text-[12px] text-muted-foreground">{booking.businesses?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[13px] text-foreground">
                {new Date(booking.date + "T00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[13px] font-mono text-foreground">{booking.start_time?.slice(0, 5)} — {booking.end_time?.slice(0, 5)}</p>
            </div>

            {booking.businesses?.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[13px] text-foreground">{booking.businesses.address}</p>
              </div>
            )}
          </div>

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-11" disabled={cancelling}>
                  {cancelling ? t("booking:bookingTrack.cancelling") : t("booking:bookingTrack.cancel")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("booking:bookingTrack.dialogTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("booking:bookingTrack.dialogDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common:buttons.no")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-[var(--error)] text-white">
                    {t("common:buttons.yes")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingTrack;
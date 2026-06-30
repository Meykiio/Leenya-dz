import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Booking } from "@/types";

const statusBadgeClasses: Record<string, string> = {
  pending: "badge-waiting",
  confirmed: "badge-confirmed",
  arrived: "badge-confirmed",
  in_service: "badge-in-service",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
  no_show: "badge-no-show",
};

export default function MyBookings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; businessId: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("id, date, start_time, end_time, status, booking_token, notes, business_id, services(name, price_dzd), businesses(name)")
      .eq("client_id", user.id)
      .order("date", { ascending: false })
      .limit(100);

    if (error) {
      if (import.meta.env.DEV) console.error('[MyBookings] failed to fetch bookings:', error.message);
      toast({ title: t("common:toast.error"), description: t("common:toast.loadError"), variant: "destructive" });
    }
    setBookings(data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchBookings(); }, [user]);

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      if (import.meta.env.DEV) console.error("cancelBooking:", error);
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
      return;
    }
    toast({ title: t("booking:myBookings.toast.cancelled") });
    fetchBookings();
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("common:statuses.pending"),
      confirmed: t("common:statuses.confirmed"),
      arrived: t("common:statuses.arrived"),
      in_service: t("common:statuses.inProgress"),
      completed: t("common:statuses.completed"),
      cancelled: t("common:statuses.cancelled"),
      no_show: t("common:statuses.noShow"),
    };
    return map[status] || status;
  };

  const submitReview = async () => {
    if (!reviewModal || !user) return;
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      business_id: reviewModal.businessId,
      booking_id: reviewModal.bookingId,
      client_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      if (import.meta.env.DEV) console.error("submitReview:", error);
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
      return;
    }
    toast({ title: t("booking:myBookings.toast.reviewPublished") });
    setReviewModal(null);
    setComment("");
    setRating(5);
  };

  const upcoming = bookings.filter((b) => !isPast(parseISO(b.date)) && b.status !== "cancelled" && b.status !== "completed" && b.status !== "no_show");
  const past = bookings.filter((b) => isPast(parseISO(b.date)) || b.status === "completed" || b.status === "cancelled" || b.status === "no_show");

  return (
    <div className="min-h-screen bg-[var(--bg-base)] max-w-lg mx-auto pb-8">
      <header className="sticky top-0 z-10 bg-[var(--bg-base)] backdrop-blur-sm border-b border-[var(--border-default)] px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)]"><ArrowLeft className="h-5 w-5 rtl:scale-x-[-1]" /></button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">{t("booking:myBookings.title")}</h1>
      </header>

      <div className="px-5 py-4 space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">📅</p>
            <p className="text-[var(--text-secondary)]">{t("booking:myBookings.empty")}</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t("booking:myBookings.upcoming")}</h2>
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <div key={b.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--text-primary)]">{b.businesses?.name}</p>
                        <Badge variant="outline" className={statusBadgeClasses[b.status] || ""}>
                          {getStatusLabel(b.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {b.services?.name} • {format(parseISO(b.date), "d MMM yyyy", { locale: fr })} à {b.start_time?.slice(0, 5)}
                      </p>
                      {b.services?.price_dzd && (
                        <p className="text-sm font-semibold text-[var(--accent)]">{b.services.price_dzd} DZD</p>
                      )}
                      {b.status !== "cancelled" && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => cancelBooking(b.id)}>
                          {t("booking:myBookings.cancel")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t("booking:myBookings.past")}</h2>
                <div className="space-y-3">
                  {past.map((b) => (
                    <div key={b.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 space-y-2 opacity-80">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--text-primary)]">{b.businesses?.name}</p>
                        <Badge variant="outline" className={statusBadgeClasses[b.status] || ""}>
                          {getStatusLabel(b.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {b.services?.name} • {format(parseISO(b.date), "d MMM yyyy", { locale: fr })}
                      </p>
                      {b.status === "completed" && (
                        <Button variant="outline" size="sm" onClick={() => setReviewModal({ bookingId: b.id, businessId: b.business_id })}>
                          <Star className="h-3 w-3 mr-1" /> {t("booking:myBookings.leaveReview")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setReviewModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-base)] border border-[var(--border-default)] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("booking:myBookings.reviewModalTitle")}</h3>
              <button onClick={() => setReviewModal(null)}><X className="h-5 w-5 text-[var(--text-tertiary)]" /></button>
            </div>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setRating(v)}>
                  <Star className={`h-8 w-8 ${v <= rating ? "fill-primary text-primary" : "text-[var(--text-tertiary)]"}`} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("booking:myBookings.reviewPlaceholder")} rows={3} />
            <Button onClick={submitReview} disabled={submittingReview} className="w-full">
              {submittingReview ? t("booking:myBookings.reviewSubmitting") : t("booking:myBookings.reviewSubmit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

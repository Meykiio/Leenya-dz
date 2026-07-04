import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, CalendarDays } from "lucide-react";
import { openWhatsApp, buildBookingConfirmationUrl, buildReminderUrl, buildBookingAcceptedUrl, buildBookingCancelledUrl } from "@/lib/whatsapp";
import { validateAlgerianPhone } from "@/lib/phone/validation";
import { useWebPush } from "@/hooks/useWebPush";
import type { Booking, Service, StaffMember, Business, NewBookingForm } from "@/types";
import BookingFilters from "./bookings/BookingFilters";
import BookingRow from "./bookings/BookingRow";
import NewBookingSlideOver from "./bookings/NewBookingSlideOver";
import PendingApprovals from "./bookings/PendingApprovals";

const statusColors: Record<string, string> = {
  pending: "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]",
  confirmed: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]",
  arrived: "bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]",
  in_service: "bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent-muted)]",
  completed: "bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border-default)]",
  cancelled: "bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]",
  no_show: "bg-[var(--bg-muted)] text-[var(--text-tertiary)] border-[var(--border-default)]",
};

/**
 * Dashboard bookings — full booking management with filtering (upcoming/by date),
 * status updates, approval flow, new booking creation, and WhatsApp communication.
 * @returns The bookings management page JSX
 */
const DashboardBookings = () => {
  const { t, i18n } = useTranslation();
  const { business } = useBusinessInfo();
  const { sendPush } = useWebPush();
  const statusLabels: Record<string, string> = {
    pending: t("dashboard:bookings.status.pending"),
    confirmed: t("dashboard:bookings.status.confirmed"),
    arrived: t("dashboard:bookings.status.arrived"),
    in_service: t("dashboard:bookings.status.inService"),
    completed: t("dashboard:bookings.status.completed"),
    cancelled: t("dashboard:bookings.status.cancelled"),
    no_show: t("dashboard:bookings.status.noShow"),
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filterMode, setFilterMode] = useState<"upcoming" | "date">("upcoming");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [businessDetails, setBusinessDetails] = useState<Pick<Business, "address" | "phone"> | null>(null);

  const [newBooking, setNewBooking] = useState<NewBookingForm>({
    client_name: "", client_phone: "", service_id: "", staff_member_id: "",
    date: format(new Date(), "yyyy-MM-dd"), start_time: "09:00", notes: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchBookings = async () => {
    if (!business) return;

    let query = supabase
      .from("bookings")
      .select("*, services(name, price_dzd, duration_minutes), staff_members(display_name)")
      .eq("business_id", business.id);

    if (filterMode === "upcoming") {
      const today = format(new Date(), "yyyy-MM-dd");
      query = query.gte("date", today).order("date").order("start_time");
    } else {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      query = query.eq("date", dateStr).order("start_time");
    }

    const { data, error } = await query;

    if (error) { if (import.meta.env.DEV) console.error("fetchBookings:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:bookings.errors.loadBookings"), variant: "destructive" }); }
    setBookings(data || []);
    setInitialLoading(false);
  };

  useEffect(() => {
    if (!business) return;

    const fetchStaticData = async () => {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_dzd")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (servicesError) {
        if (import.meta.env.DEV) console.error('[DashboardBookings] failed to fetch services:', servicesError.message);
        toast({
          title: t("dashboard:labels.error"),
          description: t("dashboard:bookings.errors.loadServices"),
          variant: "destructive"
        });
      } else {
        setServices(servicesData || []);
      }

      const { data: staffData, error: staffError } = await supabase
        .from("staff_members")
        .select("id, display_name, is_active, accepts_bookings")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (staffError) {
        if (import.meta.env.DEV) console.error('[DashboardBookings] failed to fetch staff:', staffError.message);
        toast({
          title: t("dashboard:labels.error"),
          description: t("dashboard:bookings.errors.loadStaff"),
          variant: "destructive"
        });
      } else {
        setStaffMembers(staffData || []);
      }

      const { data: bizData, error: bizError } = await supabase
        .from("businesses")
        .select("address, phone")
        .eq("id", business.id)
        .single();

      if (bizError) {
        if (import.meta.env.DEV) console.error('[DashboardBookings] failed to fetch business details:', bizError.message);
      } else {
        setBusinessDetails(bizData);
      }
    };

    fetchStaticData();
  }, [business, t]);

  useEffect(() => {
    if (!business) return;
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, selectedDate, filterMode]);

  useEffect(() => {
    if (!business) return;
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${business.id}` }, () => {
        fetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "arrived" | "in_service" | "completed" | "cancelled" | "no_show") => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const currentStatus = booking.status;

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("business_id", business.id)
      .eq("id", id)
      .eq("status", currentStatus);

    if (error) {
      if (import.meta.env.DEV) console.error("updateStatus:", error);
      toast({ title: t("dashboard:labels.error"), description: t("dashboard:bookings.errors.updateBooking"), variant: "destructive" });
      return;
    }
    fetchBookings();
    if (status === "confirmed" && business && businessDetails) {
      if (booking) {
        const url = buildBookingAcceptedUrl(
          booking.client_phone,
          business.name,
          format(new Date(booking.date), "d MMM yyyy", { locale: fr }),
          booking.start_time?.slice(0, 5),
          booking.services?.name || "Service",
          businessDetails.address ?? null
        );
        openWhatsApp(url);
      }
    }
  };

  // Accept booking: pending → confirmed + send WhatsApp + push to client
  const acceptBooking = async (id: string) => {
    await updateStatus(id, "confirmed");
    const booking = bookings.find(b => b.id === id);
    if (!booking || !business) return;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription, locale")
      .eq("booking_id", id);
    if (subs && subs.length > 0) {
      const dateLabel = booking.date
        ? new Date(booking.date + "T" + (booking.start_time || "00:00")).toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short" })
        : "";
      const timeLabel = booking.start_time?.slice(0, 5) || "";
      for (const sub of subs) {
        await sendPush(sub.subscription, {
          title: t("common:push.bookingConfirmed"),
          body: t("common:push.bookingConfirmedBody", { business: business.name, date: dateLabel, time: timeLabel }),
          url: `/booking/track/${booking.booking_token}`,
        });
      }
    }
  };

  // Reject booking: pending → cancelled + send WhatsApp cancellation
  const rejectBooking = async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    await updateStatus(id, "cancelled");
    toast({ title: t("dashboard:bookings.rejected") });
    if (booking && business && businessDetails) {
      const url = buildBookingCancelledUrl(
        booking.client_phone,
        business.name,
        format(new Date(booking.date), "d MMM yyyy", { locale: fr }),
        booking.start_time?.slice(0, 5),
        booking.services?.name || "Service"
      );
      openWhatsApp(url);
    }
  };

  // Send reminder to client
  const sendReminder = async (booking: Booking) => {
    if (!business || !businessDetails) return;
    const url = buildReminderUrl(
      booking.client_phone,
      business.name,
      booking.start_time?.slice(0, 5) || "",
      booking.services?.name || "Service",
      businessDetails.address ?? null,
      businessDetails.phone ?? null
    );
    openWhatsApp(url);
  };

  const validateNewBooking = () => {
    const errors: Record<string, string> = {};
    if (!newBooking.client_name.trim()) errors.client_name = t("dashboard:bookings.validation.nameRequired");
    if (!newBooking.client_phone.trim()) errors.client_phone = t("dashboard:bookings.validation.phoneRequired");
    else {
      const validation = validateAlgerianPhone(newBooking.client_phone);
      if (!validation.valid) {
        if (validation.errorCode === 'invalid_prefix') errors.client_phone = t("common:validation.phone.invalidPrefix");
        else if (validation.errorCode === 'invalid_too_short') errors.client_phone = t("common:validation.phone.invalidTooShort");
        else if (validation.errorCode === 'invalid_too_long') errors.client_phone = t("common:validation.phone.invalidTooLong");
      }
    }
    if (!newBooking.service_id) errors.service_id = t("dashboard:bookings.validation.selectService");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createBooking = async () => {
    if (!business || !validateNewBooking()) return;
    const normalizedPhone = validateAlgerianPhone(newBooking.client_phone).normalized;
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = services.find((s: any) => s.id === newBooking.service_id);
    const durationMin = service?.duration_minutes || 30;
    const [h, m] = newBooking.start_time.split(":").map(Number);
    const endH = h + Math.floor((m + durationMin) / 60);
    const endM = (m + durationMin) % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const { error } = await supabase.from("bookings").insert({
      business_id: business.id,
      client_name: newBooking.client_name,
      client_phone: normalizedPhone,
      service_id: newBooking.service_id || null,
      staff_member_id: newBooking.staff_member_id || null,
      date: newBooking.date,
      start_time: newBooking.start_time,
      end_time: endTime,
      notes: newBooking.notes || null,
      status: "confirmed",
    });

    if (error) {
      if (import.meta.env.DEV) console.error("createBooking:", error);
      toast({ title: t("dashboard:labels.error"), description: t("dashboard:bookings.errors.createBooking"), variant: "destructive" });
    } else {
      toast({ title: t("dashboard:bookings.created") });
      setShowNewBooking(false);
      setNewBooking({ client_name: "", client_phone: "", service_id: "", staff_member_id: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "09:00", notes: "" });
      setFormErrors({});
      fetchBookings();
    }
    setLoading(false);
  };

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search && !b.client_name.toLowerCase().includes(search.toLowerCase()) && !b.client_phone.includes(search)) return false;
    return true;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendWhatsApp = (b: any) => {
    if (!business) return;
    const url = buildBookingConfirmationUrl(
      b.client_phone, business.name,
      format(new Date(b.date), "d MMM yyyy", { locale: fr }),
      b.start_time?.slice(0, 5),
      b.services?.name || "Service",
      businessDetails?.address ?? null,
      b.id
    );
    openWhatsApp(url);
  };

  return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t("dashboard:bookings.title")}</h2>
          <Button size="sm" onClick={() => setShowNewBooking(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> {t("dashboard:bookings.new")}
          </Button>
        </div>

        {business && (
          <PendingApprovals
            businessId={business.id}
            onStatusChange={fetchBookings}
            onAccept={acceptBooking}
            onReject={rejectBooking}
          />
        )}

        <BookingFilters
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusLabels={statusLabels}
        />

        {initialLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-[80px_1fr_1fr_120px_minmax(300px,1fr)] gap-3 px-4 py-2.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{t("dashboard:bookings.time")}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{t("dashboard:bookings.client")}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{t("dashboard:bookings.service")}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{t("dashboard:bookings.status")}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">{t("dashboard:bookings.actions")}</span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-7 w-7 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">{t("dashboard:bookings.empty")}</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    statusColors={statusColors}
                    statusLabels={statusLabels}
                    onAccept={acceptBooking}
                    onReject={rejectBooking}
                    onArrived={(id) => updateStatus(id, "arrived")}
                    onNoShow={(id) => updateStatus(id, "no_show")}
                    onCancel={(id) => updateStatus(id, "cancelled")}
                    onReminder={sendReminder}
                    onWhatsApp={sendWhatsApp}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <NewBookingSlideOver
          open={showNewBooking}
          onClose={() => setShowNewBooking(false)}
          form={newBooking}
          onChange={(cb) => setNewBooking(cb)}
          formErrors={formErrors}
          services={services}
          staffMembers={staffMembers}
          loading={loading}
          onSubmit={createBooking}
        />
      </div>
  );
};

export default DashboardBookings;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, CalendarDays } from "lucide-react";
import { buildBookingConfirmationUrl, buildReminderUrl, buildBookingAcceptedUrl, buildBookingCancelledUrl } from "@/lib/whatsapp";
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

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  arrived: "Arrivé",
  in_service: "En service",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "No-show",
};

const DashboardBookings = () => {
  const { business } = useBusinessInfo();
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

    if (error) { console.error("fetchBookings:", error); toast({ title: "Erreur", description: "Impossible de charger les réservations.", variant: "destructive" }); }
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
          title: "Erreur",
          description: "Impossible de charger les services.",
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
          title: "Erreur",
          description: "Impossible de charger l'équipe.",
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
  }, [business]);

  useEffect(() => {
    if (!business) return;
    fetchBookings();
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
  }, [business]);

  const updateStatus = async (id: string, status: "pending" | "confirmed" | "arrived" | "in_service" | "completed" | "cancelled" | "no_show") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("business_id", business.id).eq("id", id);
    if (error) {
      console.error("updateStatus:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour la réservation.", variant: "destructive" });
    } else {
      fetchBookings();
      // When confirming a booking, send WhatsApp to client
      if (status === "confirmed" && business && businessDetails) {
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          const url = buildBookingAcceptedUrl(
            booking.client_phone,
            business.name,
            format(new Date(booking.date), "d MMM yyyy", { locale: fr }),
            booking.start_time?.slice(0, 5),
            booking.services?.name || "Service",
            businessDetails.address ?? null
          );
          window.open(url, "_blank");
        }
      }
    }
  };

  // Accept booking: pending → confirmed + send WhatsApp to client
  const acceptBooking = async (id: string) => {
    await updateStatus(id, "confirmed");
  };

  // Reject booking: pending → cancelled + send WhatsApp cancellation
  const rejectBooking = async (id: string) => {
    const booking = bookings.find(b => b.id === id);
    await updateStatus(id, "cancelled");
    toast({ title: "Réservation refusée" });
    if (booking && business && businessDetails) {
      const url = buildBookingCancelledUrl(
        booking.client_phone,
        business.name,
        format(new Date(booking.date), "d MMM yyyy", { locale: fr }),
        booking.start_time?.slice(0, 5),
        booking.services?.name || "Service"
      );
      window.open(url, "_blank");
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
    window.open(url, "_blank");
  };

  const validateNewBooking = () => {
    const errors: Record<string, string> = {};
    if (!newBooking.client_name.trim()) errors.client_name = "Le nom est requis";
    if (!newBooking.client_phone.trim()) errors.client_phone = "Le téléphone est requis";
    else if (newBooking.client_phone.replace(/\D/g, "").length < 9) errors.client_phone = "Au moins 9 chiffres";
    if (!newBooking.service_id) errors.service_id = "Sélectionnez un service";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createBooking = async () => {
    if (!business || !validateNewBooking()) return;
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
      client_phone: newBooking.client_phone,
      service_id: newBooking.service_id || null,
      staff_member_id: newBooking.staff_member_id || null,
      date: newBooking.date,
      start_time: newBooking.start_time,
      end_time: endTime,
      notes: newBooking.notes || null,
      status: "confirmed",
    });

    if (error) {
      console.error("createBooking:", error);
      toast({ title: "Erreur", description: "Impossible de créer la réservation.", variant: "destructive" });
    } else {
      toast({ title: "Réservation créée" });
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
    window.open(url, "_blank");
  };

  return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Réservations</h2>
          <Button size="sm" onClick={() => setShowNewBooking(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nouvelle réservation
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
            <div className="hidden sm:grid sm:grid-cols-[80px_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Heure</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Client</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Service</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Statut</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Actions</span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-7 w-7 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">Aucune réservation pour cette date</p>
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

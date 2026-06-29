import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { buildBookingTrackingUrl, buildBookingNotificationForBusinessUrl } from "@/lib/whatsapp";
import { generateTimeSlots, getDayOfWeek, formatDateLabel, formatDateForDB } from "@/lib/timeSlots";
import StepService from "./steps/StepService";
import StepStaff from "./steps/StepStaff";
import StepDateTime from "./steps/StepDateTime";
import StepDetails from "./steps/StepDetails";
import StepConfirmed from "./steps/StepConfirmed";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_dzd: number | null;
}

interface BusinessHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean | null;
}

interface StaffMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Props {
  businessId: string;
  businessName: string;
  services: Service[];
  businessHours: BusinessHour[];
  advanceBookingDays: number;
}

type Step = "service" | "staff" | "datetime" | "details" | "confirmed";

/** @description Multi-step appointment booking flow guiding users through service selection, staff selection, date/time picking, contact details, and confirmation with WhatsApp / Google Calendar actions. */
export default function AppointmentFlow({ businessId, businessName, services, businessHours, advanceBookingDays }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null | "no_preference">("no_preference");
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingToken, setBookingToken] = useState<string | null>(null);
  const [businessPhone, setBusinessPhone] = useState<string | null>(null);

  const dates = useMemo(() =>
    Array.from({ length: advanceBookingDays }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    }),
    [advanceBookingDays]
  );

  useEffect(() => {
    supabase
      .from("businesses")
      .select("phone")
      .eq("id", businessId)
      .single()
      .then(({ data }) => {
        if (data?.phone) setBusinessPhone(data.phone);
      });
  }, [businessId]);

  useEffect(() => {
    if (!selectedService) {
      setStaffMembers([]);
      setSelectedStaff("no_preference");
      return;
    }
    setLoadingStaff(true);

    const fetchStaffAndAssignments = async () => {
      const [{ data: staffData }, { data: ssData }] = await Promise.all([
        supabase
          .from("staff_members")
          .select("id, display_name, avatar_url")
          .eq("business_id", businessId)
          .eq("is_active", true)
          .eq("accepts_bookings", true),
        supabase
          .from("staff_services")
          .select("staff_member_id")
          .eq("service_id", selectedService.id),
      ]);

      if (!staffData || staffData.length === 0) {
        setStaffMembers([]);
        setSelectedStaff(null);
        setLoadingStaff(false);
        return;
      }

      const assignedIds = new Set((ssData || []).map((s) => s.staff_member_id));
      const filtered = staffData.filter((s) => assignedIds.has(s.id));
      setStaffMembers(filtered);
      if (filtered.length === 0) {
        setSelectedStaff(null);
      } else {
        setSelectedStaff("no_preference");
      }
      setLoadingStaff(false);
    };

    fetchStaffAndAssignments();
  }, [selectedService, businessId]);

  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    const dayHours = businessHours.find((h) => h.day_of_week === getDayOfWeek(selectedDate));
    if (!dayHours || dayHours.is_closed) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    const dateStr = formatDateForDB(selectedDate);
    let query = supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .eq("date", dateStr)
      .not("status", "in", "(cancelled,no_show)");
    if (selectedStaff && selectedStaff !== "no_preference") {
      query = query.eq("staff_member_id", selectedStaff.id);
    }
    query.then(({ data }) => {
      const existing = (data ?? []).map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
      const allSlots = generateTimeSlots(dayHours, selectedService.duration_minutes, existing);
      const now = new Date();
      const isToday = formatDateForDB(selectedDate) === formatDateForDB(now);
      const filtered = isToday
        ? allSlots.filter((slot) => {
            const [h, m] = slot.split(":").map(Number);
            return h * 60 + m > now.getHours() * 60 + now.getMinutes();
          })
        : allSlots;
      setSlots(filtered);
      setLoadingSlots(false);
    });
  }, [selectedDate, selectedService, selectedStaff, businessId, businessHours]);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !name.trim() || !phone.trim()) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setPhoneError(t("booking:appointmentFlow.phoneError"));
      return;
    }
    setPhoneError("");
    setSubmitting(true);

    const dateStr = formatDateForDB(selectedDate);
    const dur = selectedService.duration_minutes;
    const [h, m] = selectedTime.split(":").map(Number);
    const endMin = h * 60 + m + dur;
    const endH = Math.min(Math.floor(endMin / 60), 23);
    const endM = endMin % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const staffMemberId = selectedStaff && selectedStaff !== "no_preference" ? selectedStaff.id : null;

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        service_id: selectedService.id,
        staff_member_id: staffMemberId,
        date: dateStr,
        start_time: selectedTime,
        end_time: endTime,
        client_name: name.trim(),
        client_phone: phone.replace(/\D/g, ''),
        notes: note.trim() || null,
        status: "pending",
      })
      .select("id, booking_token")
      .maybeSingle();

    setSubmitting(false);
    if (error) {
      const msg = error.message.includes("Trop de demandes")
        ? t("booking:appointmentFlow.error.rateLimited")
        : error.message.includes("deja reserve")
        ? t("booking:appointmentFlow.error.slotTaken")
        : t("booking:appointmentFlow.error.creationFailed");
      toast({ title: t("common:toast.error"), description: msg, variant: "destructive" });
      return;
    }
    setBookingId(data.id);
    setBookingToken(data.booking_token);
    setStep("confirmed");
  };

  const trackingUrl = bookingToken ? `${window.location.origin}/booking/track/${bookingToken}` : "";

  const googleCalUrl = () => {
    if (!selectedDate || !selectedTime || !selectedService) return "#";
    const dStr = formatDateForDB(selectedDate).replace(/-/g, "");
    const [h, m] = selectedTime.split(":").map(Number);
    const startISO = `${dStr}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const em = h * 60 + m + selectedService.duration_minutes;
    const endISO = `${dStr}T${String(Math.floor(em / 60)).padStart(2, "0")}${String(em % 60).padStart(2, "0")}00`;
    return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(selectedService.name + " - " + businessName)}&dates=${startISO}/${endISO}&details=${encodeURIComponent("Reservation chez " + businessName)}`;
  };

  const shareToBusinessUrl = () => {
    if (!selectedDate || !selectedTime || !selectedService || !businessPhone) return "#";
    const dateLabel = selectedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return buildBookingNotificationForBusinessUrl(businessPhone, name.trim(), phone.trim(), dateLabel, selectedTime, selectedService.name);
  };

  const whatsappUrl = () => {
    if (!selectedDate || !selectedTime || !selectedService) return "#";
    const dateLabel = selectedDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return buildBookingTrackingUrl(null, businessName, dateLabel, selectedTime, selectedService.name, trackingUrl);
  };

  const copyTrackingLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      toast({ title: t("booking:appointmentFlow.toast.linkCopied"), description: t("booking:appointmentFlow.toast.linkCopiedDesc") });
    });
  };

  const hasStaffStep = staffMembers.length > 0;
  const allSteps: { key: Step; label: string }[] = [
    { key: "service", label: t("booking:appointmentFlow.step.service") },
    ...(hasStaffStep ? [{ key: "staff" as Step, label: t("booking:appointmentFlow.step.staff") }] : []),
    { key: "datetime" as Step, label: t("booking:appointmentFlow.step.date") },
    { key: "details" as Step, label: t("booking:appointmentFlow.step.details") },
    { key: "confirmed" as Step, label: t("booking:appointmentFlow.step.sent") },
  ];
  const currentStepIndex = allSteps.findIndex((s) => s.key === step);

  return (
    <div className="px-5 py-5">
      {step !== "confirmed" && (
        <p className="text-xs text-center text-[var(--text-tertiary)] mb-2">
          {t("booking:appointmentFlow.stepIndicator", { current: currentStepIndex + 1, total: allSteps.length })}
        </p>
      )}
      {step !== "confirmed" && (
        <div className="flex items-center justify-center gap-1 mb-6">
          {allSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  i === currentStepIndex
                    ? "bg-foreground text-background"
                    : i < currentStepIndex
                    ? "bg-foreground/15 text-foreground/50"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < allSteps.length - 1 && (
                <div
                  className={`w-6 h-px transition-colors ${
                    i < currentStepIndex ? "bg-foreground/30" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "service" && (
          <StepService
            services={services}
            selectedService={selectedService}
            onSelect={setSelectedService}
            onContinue={() => setStep(hasStaffStep ? "staff" : "datetime")}
            loadingStaff={loadingStaff}
          />
        )}

        {step === "staff" && hasStaffStep && (
          <StepStaff
            staffMembers={staffMembers}
            selectedStaff={selectedStaff}
            onSelect={setSelectedStaff}
            onBack={() => setStep("service")}
            onContinue={() => { setStep("datetime"); setSelectedDate(null); setSelectedTime(null); }}
          />
        )}

        {step === "datetime" && (
          <StepDateTime
            dates={dates}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={setSelectedDate}
            onSelectTime={setSelectedTime}
            onBack={() => setStep(hasStaffStep ? "staff" : "service")}
            onContinue={() => setStep("details")}
            businessHours={businessHours}
            loadingSlots={loadingSlots}
            slots={slots}
            hasStaffStep={hasStaffStep}
          />
        )}

        {step === "details" && (
          <StepDetails
            onBack={() => setStep("datetime")}
            name={name}
            phone={phone}
            note={note}
            phoneError={phoneError}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onNoteChange={setNote}
            selectedService={selectedService}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedStaff={selectedStaff}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {step === "confirmed" && (
          <StepConfirmed
            bookingId={bookingId}
            bookingToken={bookingToken}
            selectedService={selectedService}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            businessName={businessName}
            businessPhone={businessPhone}
            trackingUrl={trackingUrl}
            googleCalUrl={googleCalUrl()}
            shareToBusinessUrl={shareToBusinessUrl()}
            whatsappShareUrl={whatsappUrl()}
            onCopyLink={copyTrackingLink}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

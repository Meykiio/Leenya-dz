import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Users, Share2, ChevronRight, XCircle, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TicketTracker from "./TicketTracker";
import StepStaff from "@/components/booking/steps/StepStaff";
import { formatDateForDB } from "@/lib/timeSlots";
import { buildQueueTicketUrl } from "@/lib/whatsapp";
import { validateAlgerianPhone } from "@/lib/phone/validation";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_dzd: number | null;
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
}

const STORAGE_KEY = "leenya_queue_active";

/** @description Live virtual queue flow allowing clients to select a service, optionally choose staff, join the queue, and receive a ticket with real-time position tracking. */
export default function QueueFlow({ businessId, businessName, services }: Props) {
  const { t } = useTranslation();
  const [waitingCount, setWaitingCount] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null | "no_preference">(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffConfirmed, setStaffConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joinedTicketId, setJoinedTicketId] = useState<string | null>(null);
  const [joinedServiceName, setJoinedServiceName] = useState("");
  const [joinedLabel, setJoinedLabel] = useState("");
  const [restored, setRestored] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const today = formatDateForDB(new Date());

  const computeEWT = async (serviceId: string | null, waiting: number) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = formatDateForDB(thirtyDaysAgo);

    let query = supabase
      .from("queue_tickets")
      .select("called_at, created_at")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .not("called_at", "is", null)
      .not("created_at", "is", null)
      .gte("queue_date", fromDate);

    if (serviceId) query = query.eq("service_id", serviceId);

    const { data: completed } = await query;

    let avgWaitMin: number;
    if (completed && completed.length > 0) {
      const totalMin = completed.reduce((sum, t) => {
        return sum + (new Date(t.called_at!).getTime() - new Date(t.created_at!).getTime()) / 60000;
      }, 0);
      avgWaitMin = Math.round(totalMin / completed.length);
    } else {
      const fallback = selectedService?.duration_minutes ?? 10;
      avgWaitMin = Math.round(fallback * 1.5);
    }

    let staffCount = 1;
    if (serviceId) {
      const { data: ssData } = await supabase
        .from("staff_services")
        .select("staff_member_id")
        .eq("service_id", serviceId);
      if (ssData && ssData.length > 0) {
        const ids = ssData.map((s) => s.staff_member_id);
        const { count } = await supabase
          .from("staff_members")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("is_active", true)
          .in("id", ids);
        if (count && count > 0) staffCount = count;
      }
    }

    return Math.round((waiting / staffCount) * avgWaitMin);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.businessId === businessId) {
          setJoinedTicketId(saved.ticketId);
          setJoinedServiceName(saved.serviceName);
          setJoinedLabel(saved.ticketLabel);
          setPhone(saved.phone || "");
        }
      }
    } catch { /* ignore corrupt data */ }
    setRestored(true);
  }, [businessId]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from("queue_tickets")
        .select("ticket_label, status, ticket_number")
        .eq("business_id", businessId)
        .eq("queue_date", today)
        .in("status", ["waiting", "called", "in_service"])
        .order("ticket_number", { ascending: true });

      if (error) { console.error("fetchStats:", error); return; }
      if (!data) return;
      const waiting = data.filter((t) => t.status === "waiting");
      setWaitingCount(waiting.length);

      const ewt = await computeEWT(selectedService?.id ?? null, waiting.length);
      setEstimatedWait(ewt);

      const serving = data.find((t) => t.status === "in_service" || t.status === "called");
      setCurrentTicket(serving?.ticket_label ?? null);
    };
    fetchStats();

    const channel = supabase
      .channel("queue-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${businessId}` }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, today, selectedService]);

  useEffect(() => {
    if (!selectedService) {
      setStaffMembers([]);
      setSelectedStaff(null);
      setStaffConfirmed(false);
      return;
    }
    setLoadingStaff(true);
    setStaffConfirmed(false);
    setSelectedStaff(null);

    const fetchStaffAndAssignments = async () => {
      const [staffRes, ssRes] = await Promise.all([
        supabase
          .from("staff_members")
          .select("id, display_name, avatar_url")
          .eq("business_id", businessId)
          .eq("is_active", true),
        supabase
          .from("staff_services")
          .select("staff_member_id")
          .eq("service_id", selectedService.id),
      ]);

      const staffData = staffRes.data;
      const ssData = ssRes.data;
      if (staffRes.error) { console.error("fetchStaff:", staffRes.error); }
      if (ssRes.error) { console.error("fetchStaffServices:", ssRes.error); }

      if (!staffData || staffData.length === 0) {
        setStaffMembers([]);
        setLoadingStaff(false);
        return;
      }

      const assignedIds = new Set((ssData || []).map((s) => s.staff_member_id));
      const filtered = staffData.filter((s) => assignedIds.has(s.id));
      setStaffMembers(filtered);
      if (filtered.length === 0) setStaffConfirmed(true);
      setLoadingStaff(false);
    };

    fetchStaffAndAssignments();
  }, [selectedService, businessId]);

  const validatePhone = (value: string) => {
    const result = validateAlgerianPhone(value);
    if (!result.valid) {
      if (result.errorCode === 'invalid_prefix') {
        setPhoneError(t("common:validation.phone.invalidPrefix"));
      } else if (result.errorCode === 'invalid_too_short') {
        setPhoneError(t("common:validation.phone.invalidTooShort"));
      } else if (result.errorCode === 'invalid_too_long') {
        setPhoneError(t("common:validation.phone.invalidTooLong"));
      } else {
        setPhoneError(t("booking:queueFlow.phoneError"));
      }
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleJoin = async () => {
    if (!selectedService || !name.trim() || !phone.trim()) return;
    if (!validatePhone(phone)) return;
    const normalizedPhone = validateAlgerianPhone(phone).normalized;
    setSubmitting(true);

    const { data: existing, error: existingError } = await supabase
      .from("queue_tickets")
      .select("id, ticket_label")
      .eq("business_id", businessId)
      .eq("client_phone", normalizedPhone)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .maybeSingle();

    if (existingError) { console.error("checkExistingTicket:", existingError); }

    if (existing) {
      toast({
        title: t("common:toast.error"),
        description: t("common:toast.updateError"),
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const staffMemberId = selectedStaff && selectedStaff !== "no_preference" ? selectedStaff.id : null;

    const { data, error } = await supabase
      .rpc("join_queue", {
        p_business_id: businessId,
        p_service_id: selectedService.id,
        p_client_name: name.trim(),
        p_client_phone: normalizedPhone,
        p_staff_member_id: staffMemberId,
        p_estimated_wait_minutes: estimatedWait,
      })
      .maybeSingle();

    setSubmitting(false);
    if (error || !data) {
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
      return;
    }
    const newId = data.ticket_id;
    const newLabel = data.ticket_label;
    setJoinedTicketId(newId);
    setJoinedServiceName(selectedService.name);
    setJoinedLabel(newLabel);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ticketId: newId,
        businessId,
        businessName,
        serviceName: selectedService.name,
        ticketLabel: newLabel,
        phone,
        estimatedWait,
      }));
    } catch { /* storage full — non-critical */ }
  };

  const handleGoBack = () => {
    setJoinedTicketId(null);
    setJoinedServiceName("");
    setJoinedLabel("");
  };

  const handleRestoreTicket = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.businessId === businessId) {
        setJoinedTicketId(saved.ticketId);
        setJoinedServiceName(saved.serviceName);
        setJoinedLabel(saved.ticketLabel);
        setPhone(saved.phone || "");
      }
    } catch { /* ignore */ }
  }, [businessId]);

  const handleCancelTicket = async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let ticketId: string;
    try { ticketId = JSON.parse(raw).ticketId; } catch { return; }
    if (!ticketId) return;
    setCancelling(true);
    const { data, error } = await supabase
      .rpc("cancel_queue_ticket", { p_ticket_id: ticketId })
      .maybeSingle();
    setCancelling(false);
    if (error || !data) {
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: t("booking:queueFlow.cancelled") });
  };

  if (!restored) {
    return null;
  }

  if (joinedTicketId) {
    return (
      <div>
        <TicketTracker
          ticketId={joinedTicketId}
          businessName={businessName}
          serviceName={joinedServiceName}
          onBack={handleGoBack}
        />
        {joinedLabel && phone && (
          <div className="px-5 pb-4">
            <Button variant="outline" size="sm" className="w-full gap-2 h-[44px]" asChild>
              <a href={buildQueueTicketUrl(null, businessName, joinedLabel, joinedServiceName, estimatedWait)} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-4 w-4" /> {t("booking:queueFlow.shareWhatsApp")}
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const cachedRaw = !joinedTicketId ? localStorage.getItem(STORAGE_KEY) : null;
  let cachedData: { ticketLabel?: string; serviceName?: string } | null = null;
  if (cachedRaw) {
    try { const p = JSON.parse(cachedRaw); if (p.businessId === businessId) cachedData = p; } catch { /* ignore */ }
  }

  return (
    <div className="px-5 py-5 space-y-5">
      {cachedData && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-[13px] font-medium text-foreground">
            {t("booking:queueFlow.activeTicketBanner", { label: cachedData.ticketLabel ?? "" })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="flex-1 h-[36px] gap-1.5" onClick={handleRestoreTicket}>
              <Eye className="h-3.5 w-3.5" /> {t("booking:queueFlow.viewStatus")}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-[36px] gap-1.5" onClick={handleCancelTicket} disabled={cancelling}>
              <XCircle className="h-3.5 w-3.5" /> {cancelling ? t("common:loading") : t("booking:queueFlow.cancelTicket")}
            </Button>
          </div>
        </div>
      )}
      {/* Live stats */}
      <div className="rounded-md border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-[13px] font-semibold text-foreground">{t("booking:queueFlow.liveQueueTitle")}</h3>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t("booking:queueFlow.waitingCount", { count: waitingCount })}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t("booking:queueFlow.estimatedWait", { minutes: estimatedWait })}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/60">{t("booking:queueFlow.estimateDisclaimer")}</p>
        {currentTicket && (
          <p className="text-[12px] text-muted-foreground">
            {t("booking:queueFlow.currentServing", { ticket: currentTicket })}
          </p>
        )}
      </div>

      {/* Service selection */}
      <div>
        <h2 className="text-[15px] font-semibold text-foreground mb-3.5">{t("booking:queueFlow.serviceTitle")}</h2>
        <div className="flex flex-col gap-2">
          {services.map((s) => {
            const isSelected = selectedService?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedService(s)}
                className={`flex items-center justify-between rounded-md border p-[14px_16px] text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/20 hover:bg-muted/50"
                }`}
              >
                <div>
                  <p className={`text-[14px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {s.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    <span className="font-mono">{s.duration_minutes}</span> {t("common:labels.minutesShort")}
                    {s.price_dzd != null && (
                      <> · <span className="font-mono">{s.price_dzd.toLocaleString("fr-FR")}</span> DZD</>
                    )}
                  </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff selection */}
      {selectedService && staffMembers.length > 0 && !staffConfirmed && (
        <StepStaff
          staffMembers={staffMembers}
          selectedStaff={selectedStaff}
          onSelect={(s) => setSelectedStaff(s)}
          onBack={() => { setSelectedService(null); setStaffConfirmed(false); }}
          onContinue={() => setStaffConfirmed(true)}
        />
      )}

      {/* Join form */}
      {selectedService && (staffMembers.length === 0 || staffConfirmed) && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-foreground">{t("booking:queueFlow.joinTitle")}</h3>
          <div>
            <label className="text-[13px] font-medium text-foreground">{t("booking:queueFlow.nameLabel")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("booking:queueFlow.namePlaceholder")} className="mt-1" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground">{t("booking:queueFlow.phoneLabel")}</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
                placeholder={t("booking:queueFlow.phonePlaceholder")}
                type="tel"
              />
            </div>
            {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
          </div>
          <Button
            className="w-full h-[44px]"
            disabled={!name.trim() || !phone.trim() || submitting}
            onClick={handleJoin}
          >
            {submitting ? t("booking:queueFlow.submitting") : t("booking:queueFlow.takeTicket")}
          </Button>
        </div>
      )}
    </div>
  );
}

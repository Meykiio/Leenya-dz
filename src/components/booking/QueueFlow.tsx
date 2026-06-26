import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Users, Share2, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TicketTracker from "./TicketTracker";
import StepStaff from "@/components/booking/steps/StepStaff";
import { formatDateForDB } from "@/lib/timeSlots";
import { buildQueueTicketUrl } from "@/lib/whatsapp";

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

export default function QueueFlow({ businessId, businessName, services }: Props) {
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
    const fetchStats = async () => {
      const { data } = await supabase
        .from("queue_tickets")
        .select("ticket_label, status, ticket_number")
        .eq("business_id", businessId)
        .eq("queue_date", today)
        .in("status", ["waiting", "called", "in_service"])
        .order("ticket_number", { ascending: true });

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
      const [{ data: staffData }, { data: ssData }] = await Promise.all([
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
    const digits = value.replace(/\D/g, "");
    if (digits.length < 9) {
      setPhoneError("Le numéro doit contenir au moins 9 chiffres");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleJoin = async () => {
    if (!selectedService || !name.trim() || !phone.trim()) return;
    if (!validatePhone(phone)) return;
    setSubmitting(true);

    const { data: existing } = await supabase
      .from("queue_tickets")
      .select("id, ticket_label")
      .eq("business_id", businessId)
      .eq("client_phone", phone.replace(/\D/g, ''))
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .maybeSingle();

    if (existing) {
      toast({
        title: "Ticket deja actif",
        description: `Vous avez deja un ticket (${existing.ticket_label}) en attente.`,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { data: ticketData, error: rpcError } = await supabase
      .rpc("generate_ticket_number", { p_business_id: businessId });

    if (rpcError || !ticketData || ticketData.length === 0) {
      toast({ title: "Erreur", description: "Impossible de générer un ticket.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { ticket_num, ticket_lbl } = ticketData[0];

    const staffMemberId = selectedStaff && selectedStaff !== "no_preference" ? selectedStaff.id : null;

    const { data, error } = await supabase
      .from("queue_tickets")
      .insert({
        business_id: businessId,
        service_id: selectedService.id,
        staff_member_id: staffMemberId,
        client_name: name.trim(),
        client_phone: phone.replace(/\D/g, ''),
        ticket_number: ticket_num,
        ticket_label: ticket_lbl,
        queue_date: today,
        status: "waiting",
        position_in_queue: ticket_num,
        estimated_wait_minutes: estimatedWait,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de prendre un ticket.", variant: "destructive" });
      return;
    }
    setJoinedTicketId(data.id);
    setJoinedServiceName(selectedService.name);
    setJoinedLabel(ticket_lbl);
  };

  if (joinedTicketId) {
    return (
      <div>
        <TicketTracker
          ticketId={joinedTicketId}
          businessName={businessName}
          serviceName={joinedServiceName}
          onBack={() => setJoinedTicketId(null)}
        />
        {joinedLabel && phone && (
          <div className="px-5 pb-4">
            <Button variant="outline" size="sm" className="w-full gap-2 h-[44px]" asChild>
              <a href={buildQueueTicketUrl(null, businessName, joinedLabel, joinedServiceName, estimatedWait)} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-4 w-4" /> Partager sur WhatsApp
              </a>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Live stats */}
      <div className="rounded-md border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-[13px] font-semibold text-foreground">File d'attente en direct</h3>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {waitingCount} en attente</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~<span className="font-mono">{estimatedWait}</span> min</span>
        </div>
        <p className="text-[11px] text-muted-foreground/60">* Estimation basée sur l'historique — le temps réel peut varier</p>
        {currentTicket && (
          <p className="text-[12px] text-muted-foreground">
            En cours : <span className="font-mono font-semibold text-foreground">{currentTicket}</span>
          </p>
        )}
      </div>

      {/* Service selection */}
      <div>
        <h2 className="text-[15px] font-semibold text-foreground mb-3.5">Choisissez un service</h2>
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
                    <span className="font-mono">{s.duration_minutes}</span> min
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
          <h3 className="text-[15px] font-semibold text-foreground">Rejoindre la file</h3>
          <div>
            <label className="text-[13px] font-medium text-foreground">Votre nom</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className="mt-1" />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground">Téléphone</label>
            <div className="flex gap-2 mt-1">
              <span className="flex items-center rounded-md border bg-muted px-3 text-[13px] text-muted-foreground shrink-0">+213</span>
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
                placeholder="555 123 456"
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
            {submitting ? "En cours..." : "Prendre mon ticket"}
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { buildQueueCalledUrl } from "@/lib/whatsapp";
import { Plus, Tv, Users2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import type { QueueTicket, Service } from "@/types";
import QueueWaitingList from "./queue/QueueWaitingList";
import QueueServingList from "./queue/QueueServingList";
import AddToQueueDialog from "./queue/AddToQueueDialog";

const DashboardQueue = () => {
  const { business } = useBusinessInfo();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ id: string; display_name: string }[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", service_id: "", staff_member_id: "" });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchTickets = useCallback(async () => {
    if (!business) return;
    const { data, error: fetchError } = await supabase
      .from("queue_tickets")
      .select("*, services(name), staff_members(display_name)")
      .eq("business_id", business.id)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service", "completed"])
      .order("created_at");

    if (fetchError) {
      setError("Impossible de charger la file d'attente.");
      console.error("fetchTickets:", fetchError);
      toast({ title: "Erreur", description: "Impossible de charger la file d'attente.", variant: "destructive" });
    } else {
      setError(null);
    }
    setTickets(data || []);
    setInitialLoading(false);
  }, [business, today]);

  useEffect(() => {
    if (!business) return;
    fetchTickets();
    
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("is_active", true);
      
      if (error) {
        if (import.meta.env.DEV) console.error('[DashboardQueue] failed to fetch services:', error.message);
        toast({ 
          title: "Erreur", 
          description: "Impossible de charger les services.", 
          variant: "destructive" 
        });
      } else {
        setServices(data || []);
      }
    };

    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("id, display_name")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (error) {
        if (import.meta.env.DEV) console.error('[DashboardQueue] failed to fetch staff:', error.message);
      } else {
        setStaffMembers(data || []);
      }
    };
    
    fetchServices();
    fetchStaff();

    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${business.id}` }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [business, fetchTickets]);

  const waiting = tickets.filter((t) => t.status === "waiting");
  const serving = tickets.filter((t) => t.status === "called" || t.status === "in_service");
  const completedToday = tickets.filter((t) => t.status === "completed");

  const updateTicketStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { status };
    if (status === "called") updates.called_at = new Date().toISOString();
    if (status === "in_service") updates.called_at = updates.called_at || new Date().toISOString();
    if (status === "completed" || status === "no_show") updates.completed_at = new Date().toISOString();

    let query = supabase.from("queue_tickets").update(updates).eq("business_id", business.id).eq("id", id);
    if (status === "called") {
      query = query.eq("status", "waiting");
    }

    const { data, error } = await query.select("*");
    if (error) {
      console.error("updateTicketStatus:", error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour le ticket.", variant: "destructive" });
      return;
    }
    if (status === "called" && (!data || data.length === 0)) {
      toast({ title: "Ticket déjà pris", description: "Un autre membre a déjà appelé ce ticket.", variant: "destructive" });
      fetchTickets();
      return;
    }

    // When calling a ticket, send WhatsApp notification to client
    if (status === "called" && data && data.length > 0 && business) {
      const ticket = data[0];
      const whatsappUrl = buildQueueCalledUrl(
        ticket.client_phone,
        business.name,
        ticket.ticket_label,
        ticket.services?.name || "Service"
      );
      window.open(whatsappUrl, "_blank");
    }
  };

  const addToQueue = async () => {
    if (!business || !newClient.name || !newClient.phone) return;
    if (newClient.phone.replace(/\D/g, "").length < 9) {
      toast({ title: "Erreur", description: "Le numéro doit contenir au moins 9 chiffres.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from("queue_tickets")
      .select("id, ticket_label")
      .eq("business_id", business.id)
      .eq("client_phone", newClient.phone)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .maybeSingle();

    if (existing) {
      toast({
        title: "Ticket deja actif",
        description: `Ce client a deja un ticket (${existing.ticket_label}) en attente aujourd'hui.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: ticketData, error: rpcError } = await supabase
      .rpc("generate_ticket_number", { p_business_id: business.id });

    if (rpcError || !ticketData || ticketData.length === 0) {
      toast({ title: "Erreur", description: "Impossible de générer un ticket.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { ticket_num, ticket_lbl } = ticketData[0];

    const { error } = await supabase.from("queue_tickets").insert({
      business_id: business.id,
      client_name: newClient.name,
      client_phone: newClient.phone,
      service_id: newClient.service_id || null,
      staff_member_id: newClient.staff_member_id || null,
      ticket_number: ticket_num,
      ticket_label: ticket_lbl,
      queue_date: today,
      position_in_queue: waiting.length + 1,
    });

    if (error) {
      console.error("createTicket:", error);
      toast({ title: "Erreur", description: "Impossible de créer le ticket.", variant: "destructive" });
    } else {
      toast({ title: `Ticket ${ticket_lbl} créé` });
      setNewClient({ name: "", phone: "", service_id: "", staff_member_id: "" });
      setShowAddClient(false);
    }
    setLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    const mins = differenceInMinutes(new Date(), new Date(dateStr));
    if (mins < 1) return "À l'instant";
    return `${mins} min`;
  };

  const currentTicket = serving.find((t) => t.status === "called") || serving[0];

  const openDisplayMode = () => {
    if (!business) return;
    window.open(`/display/${business.slug}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">File d'attente</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openDisplayMode} className="gap-1.5 text-xs">
              <Tv className="h-3.5 w-3.5" /> Mode écran
            </Button>
            <Button size="sm" onClick={() => setShowAddClient(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Ajouter un client
            </Button>
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-lg" />
            <div className="grid lg:grid-cols-2 gap-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[var(--border-default)] py-12 text-center space-y-3">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchTickets}>Réessayer</Button>
          </div>
        ) : (
          <>
            {/* Stats strip */}
            <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] rounded-lg mb-4 px-6 py-2.5 flex items-center gap-6 flex-wrap">
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{waiting.length}</span>
                <span className="text-[13px] text-[var(--text-tertiary)] ml-1.5">en attente</span>
              </span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{serving.length}</span>
                <span className="text-[13px] text-[var(--text-tertiary)] ml-1.5">en service</span>
              </span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{completedToday.length}</span>
                <span className="text-[13px] text-[var(--text-tertiary)] ml-1.5">complétés</span>
              </span>
            </div>

            {/* Current ticket */}
            {currentTicket && (
              <div className="border-l-[3px] border-l-[var(--accent)] bg-[var(--accent-light)] rounded-r-lg px-5 py-4 mb-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Ticket en cours</p>
                <p className="font-mono text-3xl font-bold text-[var(--text-primary)]">{currentTicket.ticket_label}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{currentTicket.client_name}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">En attente</h3>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[var(--accent)] text-white font-mono text-[10px] font-semibold px-1.5">
                    {waiting.length}
                  </span>
                </div>
                <QueueWaitingList
                  tickets={waiting}
                  businessName={business!.name}
                  onCall={(id) => updateTicketStatus(id, "called")}
                  onCancel={(id) => updateTicketStatus(id, "cancelled")}
                  timeAgo={timeAgo}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">En service</h3>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[var(--warning)] text-white font-mono text-[10px] font-semibold px-1.5">
                    {serving.length}
                  </span>
                </div>
                <QueueServingList
                  tickets={serving}
                  onComplete={(id) => updateTicketStatus(id, "completed")}
                  onNoShow={(id) => updateTicketStatus(id, "no_show")}
                  timeAgo={timeAgo}
                />
              </div>
            </div>
          </>
        )}

        <AddToQueueDialog
          open={showAddClient}
          onClose={() => setShowAddClient(false)}
          name={newClient.name}
          phone={newClient.phone}
          serviceId={newClient.service_id}
          staffId={newClient.staff_member_id}
          services={services}
          staffMembers={staffMembers}
          loading={loading}
          onChangeName={(v) => setNewClient((prev) => ({ ...prev, name: v }))}
          onChangePhone={(v) => setNewClient((prev) => ({ ...prev, phone: v }))}
          onChangeService={(v) => setNewClient((prev) => ({ ...prev, service_id: v }))}
          onChangeStaff={(v) => setNewClient((prev) => ({ ...prev, staff_member_id: v }))}
          onSubmit={addToQueue}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardQueue;

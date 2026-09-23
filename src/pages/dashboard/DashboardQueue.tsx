import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { openWhatsApp, buildQueueCalledUrl } from "@/lib/whatsapp";
import { validateAlgerianPhone } from "@/lib/phone/validation";
import { Plus, Tv, UserCheck } from "lucide-react";
import type { QueueTicket, Service } from "@/types";
import QueueWaitingList from "./queue/QueueWaitingList";
import QueueServingList from "./queue/QueueServingList";
import AddToQueueDialog from "./queue/AddToQueueDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Dashboard queue — live queue management with waiting and serving lists,
 * ticket call/complete/no-show actions, adding clients, and a display-mode link.
 * @returns The queue management page JSX
 */
const DashboardQueue = () => {
  const { t } = useTranslation();
  const { business } = useBusinessInfo();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ id: string; display_name: string; profile_id: string | null }[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", service_id: "", staff_member_id: "" });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [pickingTicketId, setPickingTicketId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchTickets = useCallback(async () => {
    if (!business) return;
    const { data, error: fetchError } = await supabase
      .rpc("get_dashboard_queue", { p_business_id: business.id, p_queue_date: today });

    if (fetchError) {
      setError(t("dashboard:queue.errors.loadQueue"));
      if (import.meta.env.DEV) console.error("fetchTickets:", fetchError);
      toast({ title: t("dashboard:labels.error"), description: t("dashboard:queue.errors.loadQueue"), variant: "destructive" });
    } else {
      setError(null);
    }
    const mapped = (data || []).map((t: Record<string, unknown>) => ({
      ...t,
      services: t.service_name ? { name: t.service_name } : null,
      staff_members: t.staff_name ? { display_name: t.staff_name } : null,
    }));
    setTickets(mapped as typeof data);
    setInitialLoading(false);
  }, [business, today, t]);

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
          title: t("dashboard:labels.error"), 
          description: t("dashboard:queue.errors.loadServices"), 
          variant: "destructive" 
        });
      } else {
        setServices(data || []);
      }
    };

    const fetchStaff = async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("id, display_name, profile_id")
        .eq("business_id", business.id)
        .eq("is_active", true);

      if (error) {
        if (import.meta.env.DEV) console.error('[DashboardQueue] failed to fetch staff:', error.message);
      } else {
        setStaffMembers(data || []);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentProfileId(user.id);
    });
    
    fetchServices();
    fetchStaff();

    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${business.id}` }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [business, fetchTickets, t]);

  const waiting = tickets.filter((t) => t.status === "waiting");
  const serving = tickets.filter((t) => t.status === "called" || t.status === "in_service");
  const completedToday = tickets.filter((t) => t.status === "completed");

  const updateTicketStatus = async (id: string, status: string, staffMemberId?: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const currentStatus = ticket.status;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { status };
    if (status === "called") {
      updates.called_at = new Date().toISOString();
      if (staffMemberId) updates.staff_member_id = staffMemberId;
    }
    if (status === "in_service") updates.called_at = updates.called_at || new Date().toISOString();
    if (status === "completed" || status === "no_show") updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("queue_tickets")
      .update(updates)
      .eq("business_id", business.id)
      .eq("id", id)
      .eq("status", currentStatus)
      .select("client_phone, ticket_label, services(name)");

    if (error) {
      if (import.meta.env.DEV) console.error("updateTicketStatus:", error);
      toast({ title: t("dashboard:labels.error"), description: t("dashboard:queue.errors.updateTicket"), variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: t("dashboard:queue.errors.ticketTaken"), description: t("dashboard:queue.errors.ticketTakenDesc"), variant: "destructive" });
      fetchTickets();
      return;
    }

    // When calling a ticket, send WhatsApp notification to client
    if (status === "called" && business) {
      const ticketData = data[0];
      const whatsappUrl = buildQueueCalledUrl(
        ticketData.client_phone,
        business.name,
        ticketData.ticket_label,
        ticketData.services?.name || "Service"
      );
      openWhatsApp(whatsappUrl);
    }
  };

  const addToQueue = async () => {
    if (!business || !newClient.name || !newClient.phone) return;
    const phoneResult = validateAlgerianPhone(newClient.phone);
    if (!phoneResult.valid) {
      let msg: string
      if (phoneResult.errorCode === 'invalid_prefix') msg = t("common:validation.phone.invalidPrefix");
      else if (phoneResult.errorCode === 'invalid_too_short') msg = t("common:validation.phone.invalidTooShort");
      else if (phoneResult.errorCode === 'invalid_too_long') msg = t("common:validation.phone.invalidTooLong");
      else msg = t("dashboard:queue.errors.phoneMinDigits");
      toast({ title: t("dashboard:labels.error"), description: msg, variant: "destructive" });
      return;
    }
    const normalizedPhone = phoneResult.normalized;
    setLoading(true);

    const { data: existing } = await supabase
      .from("queue_tickets")
      .select("id, ticket_label")
      .eq("business_id", business.id)
      .eq("client_phone", phoneResult.normalized)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .maybeSingle();

    if (existing) {
      toast({
        title: t("dashboard:queue.errors.ticketActive"),
        description: t("dashboard:queue.errors.ticketActiveDesc", { ticketLabel: existing.ticket_label }),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .rpc("add_walk_in_ticket", {
        p_business_id: business.id,
        p_client_name: newClient.name,
        p_client_phone: normalizedPhone,
        p_service_id: newClient.service_id || null,
        p_staff_member_id: newClient.staff_member_id || null,
        p_estimated_wait_minutes: null,
      })
      .maybeSingle();

    if (error || !data) {
      const message = error?.message || "";
      const hint = error?.hint || "";
      if (message.includes("already_in_queue") || hint.includes("already_in_queue")) {
        toast({ title: t("dashboard:queue.errors.ticketActive"), variant: "destructive" });
      } else {
        if (import.meta.env.DEV) console.error("createTicket:", error);
        toast({ title: t("dashboard:labels.error"), description: t("dashboard:queue.errors.createTicket"), variant: "destructive" });
      }
    } else {
      toast({ title: t("dashboard:queue.ticketCreated", { ticketLabel: data.ticket_label }) });
      setNewClient({ name: "", phone: "", service_id: "", staff_member_id: "" });
      setShowAddClient(false);
    }
    setLoading(false);
  };

  const sendBackToQueue = async (id: string) => {
    const { error } = await supabase.rpc("send_ticket_back_to_queue", { p_ticket_id: id });
    if (error) { if (import.meta.env.DEV) console.error("sendBackToQueue:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:queue.errors.updateTicket"), variant: "destructive" }); }
    fetchTickets();
  };

  const reassignTicket = async (id: string, staffMemberId: string) => {
    const { error } = await supabase.rpc("reassign_queue_ticket", { p_ticket_id: id, p_staff_member_id: staffMemberId });
    if (error) { if (import.meta.env.DEV) console.error("reassignTicket:", error); toast({ title: t("dashboard:labels.error"), description: t("dashboard:queue.errors.updateTicket"), variant: "destructive" }); }
    fetchTickets();
  };

  const timeAgo = (dateStr: string) => {
    const mins = differenceInMinutes(new Date(), new Date(dateStr));
    if (mins < 1) return t("dashboard:queue.justNow");
    return t("dashboard:queue.minutes", { minutes: mins });
  };

  const handleCall = (id: string) => {
    setPickingTicketId(id);
    setStaffPickerOpen(true);
  };

  const confirmCall = async (staffMemberId: string) => {
    if (!pickingTicketId) return;
    await updateTicketStatus(pickingTicketId, "called", staffMemberId);
    setStaffPickerOpen(false);
    setPickingTicketId(null);
  };

  const currentTicket = serving.find((t) => t.status === "called") || serving[0];

  const openDisplayMode = () => {
    if (!business) return;
    window.open(`/display/${business.slug}`, "_blank");
  };

  return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-default)] pb-2.5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:queue.title")}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-[var(--accent-light)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openDisplayMode} className="gap-1.5 text-xs">
              <Tv className="h-3.5 w-3.5" /> {t("dashboard:queue.displayMode")}
            </Button>
            <Button size="sm" onClick={() => setShowAddClient(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> {t("dashboard:queue.addClient")}
            </Button>
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-2xl" />
            <div className="grid lg:grid-cols-2 gap-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--border-default)] py-12 text-center space-y-3">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchTickets}>{t("dashboard:overview.retry")}</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats strip */}
            <div className="flex items-center gap-6 flex-wrap border-b border-[var(--border-default)] pb-3">
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{waiting.length}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-1.5">{t("dashboard:queue.waiting")}</span>
              </span>
              <span className="text-[var(--text-secondary)]">·</span>
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{serving.length}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-1.5">{t("dashboard:queue.inService")}</span>
              </span>
              <span className="text-[var(--text-secondary)]">·</span>
              <span>
                <span className="font-mono text-[15px] font-medium text-[var(--text-primary)]">{completedToday.length}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-1.5">{t("dashboard:queue.completedLabel")}</span>
              </span>
            </div>

            {/* Current ticket */}
            {currentTicket && (
              <div className="border-s-[2px] border-s-[var(--accent)] bg-[var(--accent-light)] rounded-2xl px-5 py-4">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-1">{t("dashboard:queue.currentTicket")}</p>
                <p className="font-mono text-3xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">{currentTicket.ticket_label}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{currentTicket.client_name}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3 border-b border-[var(--border-default)] pb-2.5">
                  <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:queue.waitingSection")}</h3>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-[2px] bg-accent text-white font-mono text-[10px] font-medium px-1.5">
                    {waiting.length}
                  </span>
                </div>
                <QueueWaitingList
                  tickets={waiting}
                  businessName={business!.name}
                  onCall={handleCall}
                  onCancel={(id) => updateTicketStatus(id, "cancelled")}
                  timeAgo={timeAgo}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3 border-b border-[var(--border-default)] pb-2.5">
                  <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:queue.inServiceSection")}</h3>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-[2px] bg-[var(--signal)] text-white font-mono text-[10px] font-medium px-1.5">
                    {serving.length}
                  </span>
                </div>
                <QueueServingList
                  tickets={serving}
                  onComplete={(id) => updateTicketStatus(id, "completed")}
                  onNoShow={(id) => updateTicketStatus(id, "no_show")}
                  onSendBack={sendBackToQueue}
                  timeAgo={timeAgo}
                />
              </div>
            </div>
          </div>
        )}

        {/* Staff picker dialog — shown when owner clicks "Call" on a waiting ticket */}
        <Dialog open={staffPickerOpen} onOpenChange={(open) => { if (!open) { setStaffPickerOpen(false); setPickingTicketId(null); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("dashboard:queue.assignStaff")}</DialogTitle>
              <DialogDescription>{t("dashboard:queue.assignStaffDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              {staffMembers.map((sm) => {
                const isMe = currentProfileId && sm.profile_id === currentProfileId;
                return (
                  <button
                    key={sm.id}
                    onClick={() => confirmCall(sm.id)}
                    className="w-full flex items-center gap-3 rounded-[12px] border border-[var(--border-default)] px-4 py-3 text-left text-sm hover:bg-[var(--bg-muted)] transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-light)] text-accent">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{sm.display_name}</p>
                      {isMe && (
                        <p className="text-xs text-[var(--accent)]">{t("dashboard:queue.assignedToYou")}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

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
  );
};

export default DashboardQueue;
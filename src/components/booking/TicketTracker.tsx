import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { formatDateForDB } from "@/lib/timeSlots";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TicketCompleted from "./TicketCompleted";
import TicketCancelled from "./TicketCancelled";

interface Props {
  ticketId: string;
  businessName: string;
  serviceName: string;
  onBack: () => void;
}

interface TicketData {
  ticket_label: string;
  ticket_number: number;
  status: string;
  position_in_queue: number | null;
  estimated_wait_minutes: number | null;
  service_id: string | null;
  business_id: string | null;
  queue_date: string | null;
}

const CACHE_PREFIX = "leenya_ticket_";

export default function TicketTracker({ ticketId, businessName, serviceName, onBack }: Props) {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [currentServing, setCurrentServing] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [isCalled, setIsCalled] = useState(false);
  const [avgWaitTime, setAvgWaitTime] = useState<number | null>(null);
  const [staffCount, setStaffCount] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const businessIdRef = useRef<string | null>(null);
  const queueDateRef = useRef<string | null>(null);
  const serviceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${ticketId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setTicket(parsed.ticket);
        setWaitingCount(parsed.waitingCount ?? 0);
        setCurrentServing(parsed.currentServing ?? null);
      } catch { /* ignore */ }
    }
  }, [ticketId]);

  const saveCache = (t: TicketData, wc: number, cs: string | null) => {
    localStorage.setItem(`${CACHE_PREFIX}${ticketId}`, JSON.stringify({ ticket: t, waitingCount: wc, currentServing: cs }));
  };

  const fetchHistoricalData = useCallback(async (bizId: string, servId: string | null) => {
    const { data } = await supabase
      .rpc("get_completed_ticket_stats", {
        p_business_id: bizId,
        p_service_id: servId ?? undefined,
      });

    if (data && data.length > 0) {
      setAvgWaitTime(data[0].avg_wait_minutes > 0 ? data[0].avg_wait_minutes : null);
      setStaffCount(data[0].staff_count);
    }
  }, []);

  const refreshQueueContext = async (bizId: string, qDate: string, ticketNumber: number) => {
    const { data: queueData } = await supabase
      .rpc("get_queue_context", {
        p_business_id: bizId,
        p_queue_date: qDate,
        p_ticket_number: ticketNumber,
      });

    if (!queueData) return;
    const cs = queueData.length > 0 ? queueData[0].current_serving_label : null;
    setCurrentServing(cs);
    const wc = queueData.length > 0 ? queueData[0].waiting_ahead : 0;
    setWaitingCount(wc);
    return { cs, aheadCount: wc };
  };

  useEffect(() => {
    supabase
      .rpc("get_queue_ticket", { p_ticket_id: ticketId })
      .single()
      .then(({ data, error }) => {
        if (error) { setIsOffline(true); return; }
        if (!data) return;
        setIsOffline(false);
        const t: TicketData = {
          ticket_label: data.ticket_label,
          ticket_number: data.ticket_number,
          status: data.status ?? "waiting",
          position_in_queue: data.position_in_queue,
          estimated_wait_minutes: data.estimated_wait_minutes,
          service_id: data.service_id,
          business_id: data.business_id,
          queue_date: data.queue_date,
        };
        setTicket(t);
        if (data.status === "called") setIsCalled(true);
        businessIdRef.current = data.business_id;
        queueDateRef.current = data.queue_date;
        serviceIdRef.current = data.service_id;

        fetchHistoricalData(data.business_id, data.service_id);
        refreshQueueContext(data.business_id, data.queue_date, data.ticket_number).then((ctx) => {
          if (ctx) saveCache(t, ctx.aheadCount, ctx.cs);
        });
      });
  }, [ticketId, fetchHistoricalData]);

  const refetchAll = useCallback(async () => {
    if (!businessIdRef.current || !queueDateRef.current || !ticket) return;
    setIsOffline(false);
    const { data } = await supabase
      .rpc("get_queue_ticket", { p_ticket_id: ticketId })
      .single();
    if (!data) return;
    const t: TicketData = {
      ticket_label: data.ticket_label,
      ticket_number: data.ticket_number,
      status: data.status ?? "waiting",
      position_in_queue: data.position_in_queue,
      estimated_wait_minutes: data.estimated_wait_minutes,
      service_id: data.service_id,
      business_id: data.business_id,
      queue_date: data.queue_date,
    };
    setTicket(t);
    if (data.status === "called") setIsCalled(true);

    const ctx = await refreshQueueContext(
      businessIdRef.current,
      queueDateRef.current,
      t.ticket_number
    );
    if (ctx) saveCache(t, ctx.aheadCount, ctx.cs);
  }, [ticketId, ticket, refreshQueueContext]);

  useEffect(() => {
    if (!businessIdRef.current) return;

    const channel = supabase
      .channel(`queue-tracker-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${businessIdRef.current}` },
        async () => {
          refetchAll();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setIsOffline(true);
        if (status === "SUBSCRIBED") setIsOffline(false);
      });

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, businessIdRef.current, refetchAll]);

  const handleCancel = async () => {
    const { error } = await supabase
      .rpc("cancel_booking_by_token", { p_booking_id: "", p_token: "" });

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'annuler le ticket.", variant: "destructive" });
      return;
    }
    localStorage.removeItem(`${CACHE_PREFIX}${ticketId}`);
    toast({ title: "Ticket annule" });
    onBack();
  };

  const canCancel = false;

  if (!ticket) {
    return <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">Chargement...</div>;
  }

  if (ticket.status === "completed") return <TicketCompleted />;
  if (ticket.status === "cancelled") return <TicketCancelled onBack={onBack} />;

  const computedEwt = ticket.estimated_wait_minutes ?? Math.round((waitingCount / Math.max(staffCount, 1)) * (avgWaitTime ?? 15));
  const estimatedMin = computedEwt;
  const progress = waitingCount > 0 ? Math.max(10, Math.min(90, 100 - (waitingCount / (waitingCount + 3)) * 100)) : 95;

  return (
    <div className="flex flex-col px-5 py-4">
      <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
        <ChevronLeft className="h-5 w-5" />
        <span className="font-medium">{businessName}</span>
      </button>

      {isOffline && (
        <div className="flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          <WifiOff className="h-4 w-4" /> Reconnexion en cours...
        </div>
      )}

      <AnimatePresence>
        {isCalled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-6 text-center mb-4 space-y-3"
            style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
          >
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
            >
              <span style={{ color: 'var(--success)' }} className="text-xl">&#x2713;</span>
            </div>
            <h2 className="text-[22px] font-bold text-foreground">C'est votre tour !</h2>
            <p className="text-[14px] text-muted-foreground">Presentez-vous maintenant au salon</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-border bg-muted/50 p-[28px_24px] text-center">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-3.5">
          Votre ticket
        </p>

        <motion.p
          className="font-mono text-[56px] font-bold text-foreground leading-none tracking-tight"
          animate={isCalled ? { scale: [1, 1.02, 1] } : {}}
          transition={isCalled ? { repeat: Infinity, duration: 2 } : {}}
        >
          {ticket.ticket_label}
        </motion.p>

        <p className="text-[14px] text-muted-foreground mt-2 mb-6">{serviceName}</p>

        <div className="h-px bg-border -mx-1 mb-5" />

        <div className="flex items-center justify-center">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">En cours</p>
            <p className="font-mono text-[17px] font-semibold text-foreground">
              {currentServing ?? "---"}
            </p>
          </div>

          <div className="w-px h-8 bg-border" />

          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Avant vous</p>
            <p className="font-mono text-[22px] font-semibold text-foreground">{waitingCount}</p>
            <p className="text-[11px] text-muted-foreground">personne{waitingCount !== 1 ? "s" : ""}</p>
          </div>

          <div className="w-px h-8 bg-border" />

          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Attente</p>
            <p className="font-mono text-[22px] font-semibold text-foreground">~{estimatedMin}</p>
            <p className="text-[11px] text-muted-foreground">minutes</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-3">* Estimation basée sur l'historique — le temps réel peut varier</p>

        <div className="mt-4">
          <div className="w-full h-[3px] bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground mt-3.5 leading-relaxed">
          Restez sur cette page pour suivre votre position en temps reel.
        </p>
      </div>

      {!isCalled && (
        <p className="text-[12px] text-muted-foreground text-center mt-4">
          Pour annuler, contactez le salon directement.
        </p>
      )}
    </div>
  );
}

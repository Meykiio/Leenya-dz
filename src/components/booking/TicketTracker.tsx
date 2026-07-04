import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, WifiOff, XCircle, RefreshCw, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useWebPush } from "@/hooks/useWebPush";
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
  checked_in_at: string | null;
}

const CACHE_PREFIX = "leenya_ticket_";

export default function TicketTracker({ ticketId, businessName, serviceName, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const { isSupported, permission, subscribing, subscribe } = useWebPush();
  const [currentServing, setCurrentServing] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState<number | null>(null);
  const [staffCount, setStaffCount] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const businessIdRef = useRef<string | null>(null);
  const queueDateRef = useRef<string | null>(null);
  const serviceIdRef = useRef<string | null>(null);
  const staffMemberIdRef = useRef<string | null>(null);
  const ticketRef = useRef(ticket);
  const [bizIdReady, setBizIdReady] = useState(false);
  useEffect(() => { ticketRef.current = ticket; }, [ticket]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [availableServices, setAvailableServices] = useState<{ id: string; name: string }[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [availableStaff, setAvailableStaff] = useState<{ id: string; display_name: string }[]>([]);
  const [staffServices, setStaffServices] = useState<{ staff_member_id: string; service_id: string }[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [savingChange, setSavingChange] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const staffServicesByStaff = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ss of staffServices) {
      if (!map.has(ss.staff_member_id)) map.set(ss.staff_member_id, new Set());
      map.get(ss.staff_member_id)!.add(ss.service_id);
    }
    return map;
  }, [staffServices]);

  const staffServicesByService = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ss of staffServices) {
      if (!map.has(ss.service_id)) map.set(ss.service_id, new Set());
      map.get(ss.service_id)!.add(ss.staff_member_id);
    }
    return map;
  }, [staffServices]);

  const filteredStaff = useMemo(() => {
    if (!selectedServiceId) return availableStaff;
    const validIds = staffServicesByService.get(selectedServiceId);
    if (!validIds) return [];
    return availableStaff.filter((s) => validIds.has(s.id));
  }, [availableStaff, selectedServiceId, staffServicesByService]);

  const filteredServices = useMemo(() => {
    if (!selectedStaffId) return availableServices;
    const validIds = staffServicesByStaff.get(selectedStaffId);
    if (!validIds) return [];
    return availableServices.filter((s) => validIds.has(s.id));
  }, [availableServices, selectedStaffId, staffServicesByStaff]);

  useEffect(() => {
    if (selectedServiceId && selectedStaffId) {
      const validStaff = staffServicesByService.get(selectedServiceId);
      if (validStaff && !validStaff.has(selectedStaffId)) {
        setSelectedStaffId("");
      }
    }
  }, [selectedServiceId, selectedStaffId, staffServicesByService]);

  useEffect(() => {
    if (selectedStaffId && selectedServiceId) {
      const validServices = staffServicesByStaff.get(selectedStaffId);
      if (validServices && !validServices.has(selectedServiceId)) {
        setSelectedServiceId("");
      }
    }
  }, [selectedStaffId, selectedServiceId, staffServicesByStaff]);

  useEffect(() => {
    const reviewed = localStorage.getItem(`${CACHE_PREFIX}${ticketId}_reviewed`);
    if (reviewed) setSubmittedReview(true);
  }, [ticketId]);

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
    const { data, error } = await supabase
      .rpc("get_completed_ticket_stats", {
        p_business_id: bizId,
        p_service_id: servId ?? undefined,
      });
    if (error) { console.error("fetchHistoricalData:", error); return; }
    if (data && data.length > 0) {
      setAvgWaitTime(data[0].avg_wait_minutes > 0 ? data[0].avg_wait_minutes : null);
      setStaffCount(data[0].staff_count);
    }
  }, []);

  const refreshQueueContext = async (bizId: string, qDate: string, ticketNumber: number) => {
    if (!bizId || !qDate || !ticketNumber) return;
    const { data: queueData, error: queueError } = await supabase
      .rpc("get_queue_context", {
        p_business_id: bizId,
        p_queue_date: qDate,
        p_ticket_number: ticketNumber,
      });
    if (queueError) { console.error("refreshQueueContext:", queueError); return; }
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
          checked_in_at: data.checked_in_at || null,
        };
        setTicket(t);
        businessIdRef.current = data.business_id;
        queueDateRef.current = data.queue_date;
        serviceIdRef.current = data.service_id;
        staffMemberIdRef.current = data.staff_member_id;
        setBizIdReady(true);

        fetchHistoricalData(data.business_id, data.service_id);
        refreshQueueContext(data.business_id, data.queue_date, data.ticket_number).then((ctx) => {
          if (ctx) saveCache(t, ctx.aheadCount, ctx.cs);
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, fetchHistoricalData]);

  const refetchAll = useCallback(async () => {
    if (!businessIdRef.current || !queueDateRef.current || !ticketRef.current) return;
    setIsOffline(false);
    const { data, error } = await supabase
      .rpc("get_queue_ticket", { p_ticket_id: ticketId })
      .single();
    if (error) { console.error("refetchAll:", error); return; }
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
      checked_in_at: data.checked_in_at || null,
    };
    setTicket(t);

    if (data.status === "waiting" || data.status === "called") {
      const ctx = await refreshQueueContext(
        businessIdRef.current,
        queueDateRef.current,
        t.ticket_number
      );
      if (ctx) saveCache(t, ctx.aheadCount, ctx.cs);
    }
  }, [ticketId, refreshQueueContext]);

  useEffect(() => {
    if (!bizIdReady || !businessIdRef.current) return;
    const channel = supabase
      .channel(`queue-tracker-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${businessIdRef.current}` },
        async () => { refetchAll(); }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setIsOffline(true);
        if (status === "SUBSCRIBED") setIsOffline(false);
      });
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, refetchAll, bizIdReady]);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    const bizId = businessIdRef.current || ticket?.business_id;
    if (!bizId) { setSubmitting(false); return; }

    const { error } = await supabase.from("reviews").insert({
      business_id: bizId,
      ticket_id: ticketId,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
      return;
    }
    localStorage.removeItem(`${CACHE_PREFIX}${ticketId}`);
    localStorage.setItem(`${CACHE_PREFIX}${ticketId}_reviewed`, "1");
    setSubmittedReview(true);
  };

  if (!ticket) {
    return <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">{t("common:loading")}</div>;
  }

  if (ticket.status === "in_service") {
    return (
      <div className="flex flex-col px-5 py-4">
        <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
          <ChevronLeft className="h-5 w-5" />
          <span className="font-medium">{businessName}</span>
        </button>
        <div className="rounded-xl p-8 text-center space-y-4" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
          <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
            <span style={{ color: 'var(--success)' }} className="text-xl">&#x2713;</span>
          </div>
          <h2 className="text-[20px] font-bold text-foreground">{t("booking:ticketTracker.inServiceTitle")}</h2>
          <p className="text-[14px] text-muted-foreground">{t("booking:ticketTracker.inServiceSubtitle")}</p>
          <div className="pt-2">
            <p className="font-mono text-[48px] font-bold text-foreground leading-none">{ticket.ticket_label}</p>
            <p className="text-[14px] text-muted-foreground mt-2">{serviceName}</p>
          </div>
        </div>
      </div>
    );
  }

  if (ticket.status === "completed") {
    if (!submittedReview) {
      return (
        <div className="flex flex-col px-5 py-4">
          <button onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted-foreground mb-4">
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">{businessName}</span>
          </button>
          <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-5">
            <h2 className="text-[18px] font-bold text-foreground">{t("booking:ticketTracker.reviewTitle")}</h2>
            <p className="text-[13px] text-muted-foreground">{t("booking:ticketTracker.reviewSubtitle")}</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="text-3xl transition-colors">
                  <span style={{ color: star <= rating ? 'var(--accent)' : 'var(--text-tertiary)' }}>{star <= rating ? '\u2605' : '\u2606'}</span>
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("booking:ticketTracker.reviewCommentPlaceholder")}
              rows={3}
              className="text-[13px]"
            />
            <div className="flex gap-3">
              <Button onClick={handleSubmitReview} disabled={rating === 0 || submitting} className="flex-1">
                {submitting ? t("common:loading") : t("booking:ticketTracker.reviewSubmit")}
              </Button>
              <Button variant="ghost" onClick={() => { setSubmittedReview(true); }} disabled={submitting}>
                {t("booking:ticketTracker.reviewSkip")}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col px-5 py-4">
        <div className="flex-1">
          <TicketCompleted />
        </div>
        <Button onClick={() => { localStorage.removeItem(`${CACHE_PREFIX}${ticketId}`); localStorage.removeItem(`${CACHE_PREFIX}${ticketId}_reviewed`); localStorage.removeItem("leenya_queue_active"); onBack(); }} className="w-full mt-4 h-[44px]">
          {t("booking:ticketTracker.done")}
        </Button>
      </div>
    );
  }

  if (ticket.status === "cancelled") return <TicketCancelled onBack={onBack} />;

  const isCalled = ticket.status === "called";
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
          <WifiOff className="h-4 w-4" /> {t("common:loading")}
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
            <h2 className="text-[22px] font-bold text-foreground">{t("booking:ticketTracker.calledTitle")}</h2>
            <p className="text-[14px] text-muted-foreground">{t("booking:ticketTracker.calledSubtitle")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-border bg-muted/50 p-[28px_24px] text-center">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.08em] mb-3.5">
          {t("booking:ticketTracker.yourTicket")}
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("booking:ticketTracker.nowServing")}</p>
            <p className="font-mono text-[17px] font-semibold text-foreground">
              {currentServing ?? "---"}
            </p>
          </div>

          <div className="w-px h-8 bg-border" />

          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("booking:ticketTracker.aheadOfYou")}</p>
            <p className="font-mono text-[22px] font-semibold text-foreground">{waitingCount}</p>
            <p className="text-[11px] text-muted-foreground">{waitingCount !== 1 ? t("booking:ticketTracker.people") : t("booking:ticketTracker.person")}</p>
          </div>

          <div className="w-px h-8 bg-border" />

          <div className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("booking:ticketTracker.estimatedWait")}</p>
            <p className="font-mono text-[22px] font-semibold text-foreground">~{estimatedMin}</p>
            <p className="text-[11px] text-muted-foreground">{t("booking:ticketTracker.minutes")}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-3">{t("booking:ticketTracker.estimateDisclaimer")}</p>

        <div className="mt-4">
          <div className="w-full h-[3px] bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground mt-3.5 leading-relaxed">
          {t("booking:ticketTracker.stayOnPage")}
        </p>
      </div>

      {isSupported && permission !== "granted" && permission !== "unsupported" && (
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[12px] font-medium text-foreground">{t("common:push.enableTitle")}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("common:push.enableMessage")}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs w-full"
            onClick={async () => {
              const bizId = businessIdRef.current || ticket?.business_id;
              if (!bizId) return;
              await subscribe({ businessId: bizId, queueTicketId: ticketId, locale: i18n.language });
            }}
            disabled={subscribing}
          >
            {subscribing ? t("common:loading") : <><Bell className="h-3.5 w-3.5" /> {t("common:push.enableButton")}</>}
          </Button>
        </div>
      )}

      {ticket.status === "waiting" && !ticket.checked_in_at && (
        <div className="mt-5">
          <Button
            variant="default"
            size="sm"
            className="w-full gap-1.5 h-[40px] text-[13px]"
            onClick={async () => {
              await supabase.rpc("check_in_ticket", { p_ticket_id: ticketId });
              setTicket(prev => prev ? { ...prev, checked_in_at: new Date().toISOString() } : prev);
            }}
          >
            {t("booking:ticketTracker.checkIn")}
          </Button>
          <p className="text-xs text-[var(--text-tertiary)] mt-1.5 text-center">
            {t("booking:ticketTracker.checkInHint")}
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 h-[40px] text-[13px]"
          onClick={async () => {
            const { data } = await supabase.rpc("cancel_queue_ticket", { p_ticket_id: ticketId }).maybeSingle();
            if (data) {
              localStorage.removeItem(`${CACHE_PREFIX}${ticketId}`);
              localStorage.removeItem(`${CACHE_PREFIX}${ticketId}_reviewed`);
              localStorage.removeItem("leenya_queue_active");
              onBack();
            }
          }}
        >
          <XCircle className="h-4 w-4" /> {t("booking:ticketTracker.cancelTicket")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 h-[40px] text-[13px]"
          onClick={async () => {
            const bizId = businessIdRef.current;
            if (!bizId) return;
            const [svcResult, staffResult, ssResult] = await Promise.all([
              supabase.from("services").select("id, name").eq("business_id", bizId).eq("is_active", true).order("display_order"),
              supabase.from("staff_members").select("id, display_name").eq("business_id", bizId).eq("is_active", true).order("display_name"),
              supabase.from("staff_services").select("staff_member_id, service_id, staff_members!inner(business_id)").eq("staff_members.business_id", bizId),
            ]);
            if (svcResult.error) { console.error("fetchServices:", svcResult.error); return; }
            setAvailableServices(svcResult.data || []);
            setAvailableStaff(staffResult.data || []);
            setStaffServices(ssResult.data || []);
            setSelectedServiceId(serviceIdRef.current || "");
            setSelectedStaffId(staffMemberIdRef.current || "");
            setStep(1);
            setShowServicePicker(true);
          }}
        >
          <RefreshCw className="h-4 w-4" /> {t("booking:ticketTracker.changeService")}
        </Button>
      </div>

      <Dialog open={showServicePicker} onOpenChange={(open) => { setShowServicePicker(open); if (open) setStep(1); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {step === 1
                ? t("booking:ticketTracker.changeService")
                : t("booking:ticketTracker.changeStaffStep")}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? t("booking:ticketTracker.changeServiceDesc")
                : t("booking:ticketTracker.changeStaffDesc")}
            </DialogDescription>
          </DialogHeader>
          {step === 1 ? (
            <>
              {availableServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("common:loading")}</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const currentServiceName = availableServices.find(s => s.id === serviceIdRef.current)?.name;
                    const currentStaffName = staffMemberIdRef.current ? availableStaff.find(s => s.id === staffMemberIdRef.current)?.display_name : null;
                    return currentServiceName ? (
                      <div className="rounded-md bg-muted/50 border border-border p-3 text-sm">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("booking:ticketTracker.currentInfo")}</p>
                        <p className="font-medium text-foreground mt-0.5">
                          {currentServiceName}{currentStaffName ? ` \u2192 ${currentStaffName}` : ""}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <p className="text-sm font-medium mb-2">{t("booking:ticketTracker.pickService")}</p>
                    <RadioGroup value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableServices.map((s) => (
                          <div key={s.id} className={`flex items-center gap-3 rounded-md border p-3 ${s.id === serviceIdRef.current ? 'border-accent bg-accent/5' : 'border-border'}`}>
                            <RadioGroupItem value={s.id} id={`svc-${s.id}`} />
                            <Label htmlFor={`svc-${s.id}`} className="flex-1 text-sm font-medium cursor-pointer">{s.name}</Label>
                            {s.id === serviceIdRef.current && (
                              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">{t("booking:ticketTracker.currentBadge")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowServicePicker(false)}>{t("common:buttons.cancel")}</Button>
                <Button disabled={!selectedServiceId} onClick={() => setStep(2)}>
                  {t("booking:ticketTracker.nextStep")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("booking:ticketTracker.selectedService")}</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {availableServices.find(s => s.id === selectedServiceId)?.name}
                  </p>
                </div>
                {filteredStaff.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">{t("booking:ticketTracker.changeStaff")}</p>
                    <RadioGroup value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-3 rounded-md border border-border p-3">
                          <RadioGroupItem value="" id="staff-none" />
                          <Label htmlFor="staff-none" className="flex-1 text-sm font-medium cursor-pointer">{t("booking:appointmentFlow.stepStaff.noPreference")}</Label>
                        </div>
                        {filteredStaff.map((s) => (
                          <div key={s.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                            <RadioGroupItem value={s.id} id={`staff-${s.id}`} />
                            <Label htmlFor={`staff-${s.id}`} className="flex-1 text-sm font-medium cursor-pointer">{s.display_name}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/50 border border-border p-3 text-center">
                    <p className="text-sm text-muted-foreground">No staff members assigned to this service</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>{t("common:buttons.back")}</Button>
                <Button
                  disabled={savingChange || (selectedServiceId === serviceIdRef.current && selectedStaffId === (staffMemberIdRef.current || ""))}
                  onClick={async () => {
                    if (savingChange) return;
                    setSavingChange(true);
                    const oldServiceId = serviceIdRef.current;
                    const oldStaffId = staffMemberIdRef.current;
                    const { error } = await supabase.rpc("update_ticket_service", {
                      p_ticket_id: ticketId,
                      p_service_id: selectedServiceId,
                      p_staff_member_id: selectedStaffId !== (oldStaffId || "") ? (selectedStaffId || null) : undefined,
                    });
                    if (error) {
                      console.error("changeService:", error);
                      toast({ title: t("common:toast.error"), description: t("common:toast.updateError"), variant: "destructive" });
                      setSavingChange(false);
                      return;
                    }
                    setSavingChange(false);
                    serviceIdRef.current = selectedServiceId;
                    staffMemberIdRef.current = selectedStaffId || null;
                    setShowServicePicker(false);
                    toast({ title: t("booking:ticketTracker.serviceChanged") });
                    refetchAll();
                  }}
                >
                  {t("booking:ticketTracker.confirmChange")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

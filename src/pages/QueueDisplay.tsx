import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForDB } from "@/lib/timeSlots";
import { AnimatePresence, motion } from "framer-motion";

interface TicketData {
  id: string;
  ticket_label: string;
  status: "waiting" | "called" | "in_service";
  service_name: string | null;
  staff_name: string | null;
}

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function unlockAudio() {
  const ctx = getAudioCtx();
  if (!ctx || audioUnlocked) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(() => { audioUnlocked = true; }).catch(() => {});
  } else {
    audioUnlocked = true;
  }
}

function playChime() {
  const ctx = getAudioCtx();
  if (!ctx || ctx.state === "suspended") return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.04);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.35);
  });
}

export default function QueueDisplay() {
  const { slug } = useParams();
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [servingTicket, setServingTicket] = useState<TicketData | null>(null);
  const [waitingTickets, setWaitingTickets] = useState<TicketData[]>([]);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [clock, setClock] = useState(new Date());
  const today = formatDateForDB(new Date());
  const prevServingId = useRef<string | null>(null);

  const fetchQueue = useCallback(async (bizId: string) => {
    const { data } = await supabase
      .from("queue_tickets")
      .select("id, ticket_label, status, ticket_number, service_id, services(name), staff_members(display_name)")
      .eq("business_id", bizId)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .order("ticket_number", { ascending: true });

    if (!data) return;

    const mapped: TicketData[] = data.map((t: any) => ({
      id: t.id,
      ticket_label: t.ticket_label,
      status: t.status,
      service_name: t.services?.name || null,
      staff_name: t.staff_members?.display_name || null,
    }));

    const serving = mapped.find((t) => t.status === "in_service" || t.status === "called") || null;
    const waiting = mapped.filter((t) => t.status === "waiting");

    if (serving && serving.id !== prevServingId.current) {
      playChime();
    }
    prevServingId.current = serving?.id || null;

    setServingTicket(serving);
    setWaitingTickets(waiting);
  }, [today]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("businesses")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBusinessName(data.name);
        setBusinessId(data.id);
        fetchQueue(data.id);
      });
  }, [slug, fetchQueue]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel("display-queue")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "queue_tickets",
        filter: `business_id=eq.${businessId}`,
      }, () => fetchQueue(businessId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetchQueue]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener("mousemove", handleMove);
    timer = setTimeout(() => setCursorHidden(true), 3000);
    return () => { window.removeEventListener("mousemove", handleMove); clearTimeout(timer); };
  }, []);

  const clockStr = clock.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
  const nextFew = waitingTickets.slice(0, 5);

  const handleClick = () => {
    unlockAudio();
  };

  return (
    <div
      onClick={handleClick}
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      style={{
        background: "#0C0C0A",
        cursor: cursorHidden ? "none" : "default",
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 py-7 z-10">
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "15px", fontWeight: 500 }}>
          {businessName}
        </p>
        {waitingTickets.length > 0 && (
          <div className="flex items-center gap-2">
            <motion.span
              key={waitingTickets.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#22C55E", display: "inline-block",
                }}
              />
              {waitingTickets.length} en attente
            </motion.span>
          </div>
        )}
      </div>

      {/* Center: hero card */}
      <div className="flex-1 flex items-center justify-center">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 64px",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            minWidth: "420px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.3)",
              marginBottom: "16px",
            }}
          >
            {servingTicket?.status === "called" ? "Nouvel appel" : "Ticket en cours"}
          </p>

          <AnimatePresence mode="wait">
            {servingTicket ? (
              <motion.div
                key={servingTicket.ticket_label}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -20 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "128px",
                    fontWeight: 900,
                    color: "#FFFFFF",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: "12px",
                  }}
                >
                  {servingTicket.ticket_label}
                </p>
                {(servingTicket.service_name || servingTicket.staff_name) && (
                  <div style={{ textAlign: "center" }}>
                    {servingTicket.service_name && (
                      <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                        {servingTicket.service_name}
                      </p>
                    )}
                    {servingTicket.staff_name && (
                      <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
                        avec {servingTicket.staff_name}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}
              >
                <div style={{ display: "flex", gap: "10px" }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.15, 0.6, 0.15] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      style={{
                        width: "10px", height: "10px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.4)", display: "inline-block",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>
                  En attente de clients...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom: next tickets row */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-10 pb-8">
        {nextFew.length > 0 ? (
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.2)",
                marginBottom: "12px",
              }}
            >
              Prochains
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <AnimatePresence mode="popLayout">
                {nextFew.map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      textAlign: "center",
                      minWidth: "80px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "22px",
                        fontWeight: 600,
                        color: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                        lineHeight: 1.2,
                      }}
                    >
                      {ticket.ticket_label}
                    </p>
                    {ticket.service_name && (
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>
                        {ticket.service_name}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Clock + watermark */}
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "14px",
              color: "rgba(255,255,255,0.15)",
            }}
          >
            {clockStr}
          </p>
          <p style={{ fontSize: "11px", marginTop: "4px", color: "rgba(255,255,255,0.07)" }}>
            propulse par leenya
          </p>
          {!audioUnlocked && (
            <p style={{ fontSize: "10px", marginTop: "6px", color: "rgba(255,255,255,0.12)" }}>
              cliquer pour activer le son
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

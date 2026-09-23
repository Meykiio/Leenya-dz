import { useTranslation } from "react-i18next";
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
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

/* Leenya Design System — dark tokens (TV mode is always the dark register) */
const DS = {
  bg: "#0F1623",
  surface: "#1A2235",
  surfaceHigh: "#263044",
  outline: "#263044",
  onSurface: "#E8EEFF",
  muted: "#7A8BAD",
  primary: "#3B82F6",
  signal: "#FF4D2E",
  positive: "#10B981",
  mono: "'DM Mono', monospace",
  body: "'Noto Sans', system-ui, sans-serif",
};

/**
 * Queue TV display — full-screen real-time queue board for waiting rooms.
 * Shows the currently served ticket and upcoming tickets with audio chime on update.
 * @returns The queue display page JSX
 */
export default function QueueDisplay() {
  const { t } = useTranslation();
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
    const { data, error } = await supabase
      .rpc("get_business_queue", { p_business_id: bizId, p_queue_date: today });

    if (error) { console.error("fetchQueue:", error); return; }
    if (!data) return;

    const mapped: TicketData[] = data.map((t: Record<string, unknown>) => ({
      id: t.id,
      ticket_label: t.ticket_label,
      status: t.status,
      service_name: t.service_name || null,
      staff_name: t.staff_name || null,
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
      .then(({ data, error }) => {
        if (error) { console.error("fetchBusinessBySlug:", error); return; }
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

  const servingColor = servingTicket
    ? servingTicket.status === "called" ? DS.primary : DS.signal
    : DS.muted;

  return (
    <div
      onClick={handleClick}
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      style={{
        background: DS.bg,
        cursor: cursorHidden ? "none" : "default",
        fontFamily: DS.body,
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 py-7 z-10">
        <p style={{ color: DS.muted, fontSize: "15px", fontWeight: 500 }}>
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
                padding: "5px 10px",
                borderRadius: "2px",
                background: DS.surfaceHigh,
                color: DS.muted,
                fontFamily: DS.mono,
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: DS.positive, display: "inline-block",
                }}
              />
              {t("booking:queueDisplay.waitingCount", { count: waitingTickets.length })}
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
            borderRadius: "16px",
            border: `1px solid ${DS.outline}`,
            borderInlineStart: `2px solid ${servingColor}`,
            background: DS.surface,
            minWidth: "420px",
            position: "relative",
          }}
        >
          <p
            style={{
              fontFamily: DS.mono,
              fontSize: "11px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: DS.muted,
              marginBottom: "16px",
            }}
          >
            {t("booking:queueDisplay.currentTicket")}
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
                    fontFamily: DS.mono,
                    fontSize: "120px",
                    fontWeight: 500,
                    color: servingColor,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: "16px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {servingTicket.ticket_label}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "2px",
                    fontFamily: DS.mono,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: servingTicket.status === "called"
                      ? "rgba(59,130,246,0.13)"
                      : "rgba(255,77,46,0.12)",
                    color: servingColor,
                    marginBottom: "14px",
                  }}
                >
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor" }} />
                  {servingTicket.status === "called"
                    ? t("booking:queueDisplay.called")
                    : t("booking:queueDisplay.inService")}
                </span>
                {(servingTicket.service_name || servingTicket.staff_name) && (
                  <div style={{ textAlign: "center" }}>
                    {servingTicket.service_name && (
                      <p style={{ fontSize: "18px", color: DS.onSurface, fontWeight: 500 }}>
                        {servingTicket.service_name}
                      </p>
                    )}
                    {servingTicket.staff_name && (
                      <p style={{ fontSize: "15px", color: DS.muted, marginTop: "4px" }}>
                        {t("booking:queueDisplay.withStaff", { staffName: servingTicket.staff_name })}
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
                        background: DS.muted, display: "inline-block",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "16px", color: DS.muted, fontWeight: 400 }}>
                  {t("booking:queueDisplay.waitingForClients")}
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
                fontFamily: DS.mono,
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: DS.muted,
                marginBottom: "12px",
              }}
            >
              {t("booking:queueDisplay.nextUp")}
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
                      border: `1px solid ${DS.outline}`,
                      background: DS.surface,
                      textAlign: "center",
                      minWidth: "80px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: DS.mono,
                        fontSize: "22px",
                        fontWeight: 500,
                        color: i === 0 ? DS.onSurface : DS.muted,
                        lineHeight: 1.2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {ticket.ticket_label}
                    </p>
                    {ticket.service_name && (
                      <p style={{ fontSize: "10px", color: DS.muted, marginTop: "2px" }}>
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
              fontFamily: DS.mono,
              fontSize: "14px",
              color: DS.muted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {clockStr}
          </p>
          <p style={{ fontSize: "11px", marginTop: "4px", color: DS.muted, opacity: 0.6 }}>
            {t("booking:queueDisplay.poweredBy")}
          </p>
          {!audioUnlocked && (
            <p style={{ fontSize: "10px", marginTop: "6px", color: DS.muted, opacity: 0.7 }}>
              {t("booking:queueDisplay.clickToActivateSound")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
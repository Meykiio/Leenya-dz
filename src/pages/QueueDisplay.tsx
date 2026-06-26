import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForDB } from "@/lib/timeSlots";

export default function QueueDisplay() {
  const { slug } = useParams();
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
  const [currentService, setCurrentService] = useState<string | null>(null);
  const [waitingTickets, setWaitingTickets] = useState<string[]>([]);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [clock, setClock] = useState(new Date());
  const today = formatDateForDB(new Date());

  const fetchQueue = useCallback(async (bizId: string) => {
    const { data } = await supabase
      .from("queue_tickets")
      .select("ticket_label, status, ticket_number, service_id")
      .eq("business_id", bizId)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .order("ticket_number", { ascending: true });

    if (!data) return;
    const serving = data.find((t) => t.status === "in_service" || t.status === "called");
    setCurrentTicket(serving?.ticket_label ?? null);
    // We don't have service name from this query, keep null for now
    setWaitingTickets(data.filter((t) => t.status === "waiting").map((t) => t.ticket_label));
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
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${businessId}` }, () => {
        fetchQueue(businessId);
      })
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

  const clockStr = clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const nextFew = waitingTickets.slice(0, 5);

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{
        background: "#0C0C0A",
        cursor: cursorHidden ? "none" : "default",
      }}
    >
      {/* Top-left: business name */}
      <p className="absolute top-6 left-8 text-[13px] font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
        {businessName}
      </p>

      {/* Center content */}
      <div className="flex flex-col items-center">
        <p
          className="text-[11px] font-medium uppercase"
          style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}
        >
          Ticket en cours
        </p>

        {currentTicket ? (
          <p
            className="font-mono font-extrabold leading-none mt-2"
            style={{ fontSize: "112px", color: "#FFFFFF", letterSpacing: "-0.03em" }}
          >
            {currentTicket}
          </p>
        ) : (
          <p
            className="font-mono font-extrabold leading-none mt-2"
            style={{ fontSize: "112px", color: "rgba(255,255,255,0.12)", letterSpacing: "-0.03em" }}
          >
            ---
          </p>
        )}

        {/* Divider */}
        <div className="mt-6 mb-6" style={{ width: "120px", height: "1px", background: "rgba(255,255,255,0.08)" }} />

        {/* Next tickets */}
        {nextFew.length > 0 && (
          <>
            <p
              className="text-[11px] font-medium uppercase mb-4"
              style={{ color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em" }}
            >
              Prochains numéros
            </p>
            <div className="flex items-center gap-6">
              {nextFew.map((label, i) => (
                <span
                  key={label}
                  className="font-mono text-[22px] font-medium"
                  style={{ color: i === 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </>
        )}

        {nextFew.length === 0 && !currentTicket && (
          <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            Aucun ticket en attente
          </p>
        )}
      </div>

      {/* Bottom-right: clock + watermark */}
      <div className="absolute bottom-6 right-8 text-right">
        <p className="font-mono text-[13px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          {clockStr}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.10)" }}>
          leenya
        </p>
      </div>
    </div>
  );
}

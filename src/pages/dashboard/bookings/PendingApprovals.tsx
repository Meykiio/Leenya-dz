import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";
import type { Booking } from "@/types";

const MAX_VISIBLE = 10;

interface Props {
  businessId: string;
  onStatusChange: () => void;
}

export default function PendingApprovals({ businessId, onStatusChange }: Props) {
  const [pending, setPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("bookings")
      .select("*, services(name, price_dzd, duration_minutes), staff_members(display_name)")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .gte("date", today)
      .order("date")
      .order("start_time");
    setPending(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, [businessId]);

  const handleStatus = async (id: string, status: string) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    onStatusChange();
    fetchPending();
  };

  if (loading) return <Skeleton className="h-32 rounded-lg" />;
  if (pending.length === 0) return null;

  const visible = pending.slice(0, MAX_VISIBLE);
  const remaining = pending.length - MAX_VISIBLE;

  return (
    <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--warning-border)] bg-[var(--warning-bg)]">
        <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
        <span className="text-sm font-semibold text-[var(--warning)]">
          {pending.length} reservation{pending.length > 1 ? "s" : ""} en attente de confirmation
        </span>
      </div>
      <div className="divide-y divide-[var(--warning-border)]">
        {visible.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 min-w-[120px] shrink-0">
              <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <span className="text-xs text-[var(--text-tertiary)]">
                {format(new Date(b.date), "d MMM", { locale: fr })} a {b.start_time?.slice(0, 5)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{b.services?.name || "—"} {b.staff_members?.display_name ? `· ${b.staff_members.display_name}` : ""}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" onClick={() => handleStatus(b.id, "confirmed")} className="h-7 text-xs px-3">
                Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatus(b.id, "cancelled")} className="h-7 text-xs px-3 text-[var(--error)] border-[var(--error-border)]">
                Refuser
              </Button>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-4 py-2.5 text-center text-xs text-[var(--text-tertiary)]">
            et {remaining} autre{remaining > 1 ? "s" : ""} — utilisez le filtre de statut "En attente" pour toutes les voir
          </div>
        )}
      </div>
    </div>
  );
}

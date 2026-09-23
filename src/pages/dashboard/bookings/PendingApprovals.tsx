import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import { Clock, AlertCircle } from "lucide-react";
import type { Booking } from "@/types";

const MAX_VISIBLE = 10;

interface Props {
  businessId: string;
  onStatusChange: () => void;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function PendingApprovals({ businessId, onStatusChange, onAccept, onReject }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("fr") ? fr : i18n.language?.startsWith("ar") ? ar : enUS;
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPending(); }, [businessId]);

  const handleAccept = async (id: string) => {
    await onAccept(id);
    onStatusChange();
    fetchPending();
  };

  const handleReject = async (id: string) => {
    await onReject(id);
    onStatusChange();
    fetchPending();
  };

  if (loading) return <Skeleton className="h-32 rounded-2xl" />;
  if (pending.length === 0) return null;

  const visible = pending.slice(0, MAX_VISIBLE);
  const remaining = pending.length - MAX_VISIBLE;

  return (
    <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--warning-border)] bg-[var(--warning-bg)]">
        <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
        <span className="text-[13px] font-semibold text-[var(--warning)]">
          {t("dashboard:bookings.pendingCount", { count: pending.length })}
        </span>
      </div>
      <div className="divide-y divide-[var(--warning-border)]">
        {visible.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 min-w-[120px] shrink-0">
              <Clock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                {format(new Date(b.date), "d MMM", { locale: dateLocale })} {t("dashboard:bookings.at")} {b.start_time?.slice(0, 5)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{b.services?.name || "—"} {b.staff_members?.display_name ? `· ${b.staff_members.display_name}` : ""}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button size="sm" onClick={() => handleAccept(b.id)} className="h-8 text-xs px-3">
                {t("dashboard:bookings.accept")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject(b.id)} className="h-8 text-xs px-3 text-[var(--error)] border-[var(--error-border)]">
                {t("dashboard:bookings.reject")}
              </Button>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-4 py-2.5 text-center text-xs text-[var(--text-secondary)]">
            {t("dashboard:bookings.pendingMore", { remaining })}
          </div>
        )}
      </div>
    </div>
  );
}
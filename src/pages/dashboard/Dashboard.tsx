import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Users2, TrendingUp, AlertCircle, Plus, Copy, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Booking, QueueTicket } from "@/types";

const statusBadgeClasses: Record<string, string> = {
  pending: "badge-waiting",
  confirmed: "badge-confirmed",
  arrived: "badge-confirmed",
  in_service: "badge-in-service",
  completed: "badge-completed",
  cancelled: "badge-cancelled",
  no_show: "badge-no-show",
};

/**
 * Dashboard overview — shows today's stats (bookings, queue, revenue, pending),
 * a greeting, quick-action buttons, and preview lists for today's bookings and queue.
 * @returns The dashboard overview page JSX
 */
const GREETINGS: Record<string, Record<string, string[]>> = {
  en: {
    morning: [
      "Good morning {{name}}! Ready for a great day?",
      "Morning {{name}}! Let's make today count!",
      "Rise and shine {{name}}!",
      "Hey {{name}}, great morning to get things done!",
      "Good morning {{name}}! Coffee's ready ☕",
    ],
    afternoon: [
      "Good afternoon {{name}}! How's your day going?",
      "Hey {{name}}! Hope the day's treating you well!",
      "Afternoon {{name}}! Let's finish strong!",
      "Keep it up {{name}}! You're doing great!",
      "Hey {{name}}, still crushing it I see!",
    ],
    evening: [
      "Good evening {{name}}! Almost there!",
      "Hey {{name}}! Wrapping up a great day?",
      "Evening {{name}}! One last push!",
      "You made it through {{name}}! Well done!",
      "Hey {{name}}! Time to close up shop!",
    ],
  },
  fr: {
    morning: [
      "Bonjour {{name}} ! Prêt pour une belle journée ?",
      "Salut {{name}} ! On va déchirer aujourd'hui !",
      "Bien le bonjour {{name}} ! ☀️",
      "Hey {{name}} ! Belle matinée pour tout déchirer !",
      "Lever de soleil, lever de boss {{name}} !",
    ],
    afternoon: [
      "Bon après-midi {{name}} ! Comment se passe la journée ?",
      "Salut {{name}} ! J'espère que tout roule !",
      "Hey {{name}} ! On continue sur la lancée !",
      "Courage {{name}} ! La moitié est faite !",
      "Toujours au top {{name}} !",
    ],
    evening: [
      "Bonsoir {{name}} ! Presque fini !",
      "Hey {{name}} ! Belle journée hein ?",
      "Dernière ligne droite {{name}} !",
      "Bravo {{name}} ! Tu as assuré aujourd'hui !",
      "Il est l'heure de fermer {{name}} !",
    ],
  },
  ar: {
    morning: [
      "صباح الخير {{name}}! مستعد ليوم رائع؟",
      "صباح النور {{name}}! يوم جديد مليء بالنجاح!",
      "هيا {{name}}! الصباح يبدأ بالإنجاز!",
      "أهلاً {{name}}! صباح مليء بالنشاط!",
      "يوم جديد {{name}}! لنصنع الفرق!",
    ],
    afternoon: [
      "مساء الخير {{name}}! كيف يسير يومك؟",
      "أهلاً {{name}}! نتمنى أن يومك جميل!",
      "هيا {{name}}! لنكمل بقوة!",
      "استمر {{name}}! أنت تبلي حسناً!",
      "نصف الطريق {{name}}! استمر بنفس القوة!",
    ],
    evening: [
      "مساء {{name}}! أوشكنا على الانتهاء!",
      "أهلاً {{name}}! يوم حافل أليس كذلك؟",
      "آخر جولة {{name}}! لنختم بقوة!",
      "عمل رائع {{name}}! كنت مبدعاً اليوم!",
      "حان وقت الإغلاق {{name}}!",
    ],
  },
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { business } = useBusinessInfo();
  const hour = new Date().getHours();
  const timeBlock = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const [greetingIndex] = useState(() => Math.floor(Math.random() * 5));
  const [profileFullName, setProfileFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) setProfileFullName(data.full_name);
    });
  }, [user]);

  const statusLabels: Record<string, string> = {
    pending: t("dashboard:bookings.status.pending"),
    confirmed: t("dashboard:bookings.status.confirmed"),
    arrived: t("dashboard:bookings.status.arrived"),
    in_service: t("dashboard:bookings.status.inService"),
    completed: t("dashboard:bookings.status.completed"),
    cancelled: t("dashboard:bookings.status.cancelled"),
    no_show: t("dashboard:bookings.status.noShow"),
  };
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAll = useCallback(async () => {
    if (!business) return;
    setError(null);
    setLoading(true);
    const [bookingsRes, queueRes, pendingRes] = await Promise.all([
      supabase.from("bookings")
        .select("*, services(name, price_dzd), staff_members(display_name)")
        .eq("business_id", business.id).eq("date", today).order("start_time"),
      supabase.from("queue_tickets")
        .select("*, services(name)")
        .eq("business_id", business.id).eq("queue_date", today)
        .in("status", ["waiting", "called", "in_service"]).order("created_at"),
      supabase.from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("date", today)
        .eq("status", "pending"),
    ]);

    if (bookingsRes.error || queueRes.error) {
      setError(t("dashboard:overview.error"));
    }
    setBookings(bookingsRes.data || []);
    const tickets = queueRes.data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setQueueCount(tickets.filter((t: any) => t.status === "waiting").length);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setQueueTickets(tickets.filter((t: any) => t.status === "waiting").slice(0, 3));
    setPendingCount(pendingRes.count || 0);
    setLoading(false);
  }, [business, today, t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const revenue = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
    .reduce((sum, b) => sum + (b.services?.price_dzd || 0), 0);

  const noShows = bookings.filter((b) => b.status === "no_show").length;
  const noShowRate = bookings.length > 0 ? Math.round((noShows / bookings.length) * 100) : 0;

  const profileName = profileFullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || t("dashboard:overview.user");

  const copyLink = async () => {
    if (!business) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    toast({ title: t("dashboard:overview.linkCopied") });
  };

  const formatRevenue = (val: number) => val.toLocaleString("fr-FR").replace(/,/g, " ");

  const stats = [
    {
      label: t("dashboard:overview.bookings"),
      icon: CalendarDays,
      value: bookings.length,
      accent: false,
      pulse: false,
    },
    {
      label: t("dashboard:overview.queue"),
      icon: Users2,
      value: queueCount,
      accent: queueCount > 0,
      pulse: queueCount > 0,
    },
    {
      label: t("dashboard:overview.revenue"),
      icon: TrendingUp,
      value: `${formatRevenue(revenue)} DZD`,
      accent: false,
      pulse: false,
    },
    {
      label: t("dashboard:overview.pending"),
      icon: AlertCircle,
      value: pendingCount,
      accent: pendingCount > 0,
      pulse: pendingCount > 0,
    },
  ];

  return (
      <div className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-14 w-72" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-card py-12 text-center space-y-3">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => { setError(""); fetchAll(); }}>{t("dashboard:overview.retry")}</Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="font-display text-lg sm:text-[22px] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] break-words">
                  {(GREETINGS[i18n.language] || GREETINGS.en)[timeBlock][greetingIndex].replace("{{name}}", profileName)}
                </h1>
                <p className="text-[13px] text-[var(--text-secondary)] capitalize mt-0.5">
                  {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate("/dashboard/bookings")} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t("dashboard:overview.newBooking")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate("/dashboard/queue")} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t("dashboard:overview.newQueue")}
                </Button>
              </div>
            </div>

            {/* Stats grid — clean, no nested cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border-default)] rounded-2xl overflow-hidden border border-[var(--border-default)]">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-card p-5"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-[var(--border-default)] pb-2.5">
                    <span className="font-mono text-[10px] font-medium uppercase text-[var(--text-secondary)] tracking-[0.08em]">
                      {s.label}
                    </span>
                    <s.icon className="h-[14px] w-[14px] text-[var(--text-secondary)]" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    {s.pulse && (
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse shrink-0" />
                    )}
                    <span
                      className={`font-mono text-[28px] font-medium leading-none tracking-[-0.02em] ${
                        s.accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {s.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick link */}
            <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-xs text-[var(--text-secondary)]">
              <Copy className="h-3.5 w-3.5" /> {t("dashboard:overview.copyLink")}
            </Button>

            {/* Today's bookings */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border-default)] pb-2.5">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:overview.today")}</h2>
                  <span className="text-[13px] text-[var(--text-secondary)] capitalize">
                    {format(new Date(), "EEEE d MMMM", { locale: fr })}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/bookings")} className="gap-1 text-xs text-[var(--text-secondary)]">
                  {t("dashboard:overview.viewAll")} <ArrowRight className="h-3 w-3 rtl:scale-x-[-1]" />
                </Button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays className="h-7 w-7 text-[var(--text-secondary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">{t("dashboard:overview.noBookings")}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="font-mono text-[13px] text-[var(--text-secondary)] w-14 shrink-0">{b.start_time?.slice(0, 5)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{b.services?.name || "—"} • {b.staff_members?.display_name || "—"}</p>
                      </div>
                      <Badge variant="outline" className={statusBadgeClasses[b.status || "pending"]}>{statusLabels[b.status || "pending"]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Queue preview */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border-default)] pb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:overview.queueTitle")}</h2>
                  {queueCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-[var(--accent-light)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--accent)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      {t("dashboard:overview.live")}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/queue")} className="gap-1 text-xs text-[var(--text-secondary)]">
                  {t("dashboard:overview.manage")} <ArrowRight className="h-3 w-3 rtl:scale-x-[-1]" />
                </Button>
              </div>

              {queueTickets.length === 0 ? (
                <div className="py-8 text-center">
                  <Users2 className="h-6 w-6 text-[var(--text-secondary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">{t("dashboard:overview.queueEmpty")}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {queueTickets.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="font-mono text-[13px] font-medium text-[var(--accent)]">{t.ticket_label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
  );
};

export default Dashboard;
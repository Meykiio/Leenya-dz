import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { toast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MetricCards from "@/components/dashboard/analytics/MetricCards";
import BookingsChart from "@/components/dashboard/analytics/BookingsChart";
import QueueChart from "@/components/dashboard/analytics/QueueChart";
import PeakHoursGrid from "@/components/dashboard/analytics/PeakHoursGrid";
import PopularServices from "@/components/dashboard/analytics/PopularServices";
import StaffPerformance from "@/components/dashboard/analytics/StaffPerformance";
import BookingHistoryTable from "@/components/dashboard/analytics/BookingHistoryTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, format, parseISO, differenceInDays,
  eachDayOfInterval, subDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Booking, QueueTicket, Review, Service, StaffMember } from "@/types";

type Range = "week" | "month" | "3months";

function getRange(r: Range) {
  const now = new Date();
  switch (r) {
    case "week": return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "3months": return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
  }
}

function getPrevRange(r: Range) {
  const { start, end } = getRange(r);
  const days = differenceInDays(end, start) + 1;
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return { start: prevStart, end: prevEnd };
}

const DashboardAnalytics = () => {
  const { business } = useBusinessInfo();
  const [range, setRange] = useState<Range>("month");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [prevBookings, setPrevBookings] = useState<Booking[]>([]);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [prevQueueTickets, setPrevQueueTickets] = useState<QueueTicket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    const { start, end } = getRange(range);
    const prev = getPrevRange(range);
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");

    const fetchData = async () => {
      setLoading(true);

      const [
        bRes, pRes, qRes, pqRes,
        rRes, sRes, stRes,
      ] = await Promise.all([
        supabase.from("bookings").select("id, date, start_time, end_time, status, created_at, service_id, staff_member_id, services(name, price_dzd, duration_minutes), staff_members(display_name)").eq("business_id", business.id).gte("date", fmt(start)).lte("date", fmt(end)).order("date", { ascending: false }),
        supabase.from("bookings").select("id, status, service_id, services(price_dzd)").eq("business_id", business.id).gte("date", fmt(prev.start)).lte("date", fmt(prev.end)),
        supabase.from("queue_tickets").select("*, services(name)").eq("business_id", business.id).gte("queue_date", fmt(start)).lte("queue_date", fmt(end)).order("queue_date", { ascending: false }),
        supabase.from("queue_tickets").select("id, status, service_id, called_at, completed_at").eq("business_id", business.id).gte("queue_date", fmt(prev.start)).lte("queue_date", fmt(prev.end)),
        supabase.from("reviews").select("*").eq("business_id", business.id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        supabase.from("services").select("id, name").eq("business_id", business.id),
        supabase.from("staff_members").select("id, display_name").eq("business_id", business.id),
      ]);

      if (bRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] bookings:', bRes.error.message);
      if (pRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] prev bookings:', pRes.error.message);
      if (qRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] queue:', qRes.error.message);
      if (pqRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] prev queue:', pqRes.error.message);
      if (rRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] reviews:', rRes.error.message);
      if (sRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] services:', sRes.error.message);
      if (stRes.error && import.meta.env.DEV) console.error('[DashboardAnalytics] staff:', stRes.error.message);

      if (bRes.error || qRes.error) {
        toast({ title: "Erreur", description: "Impossible de charger les donnees.", variant: "destructive" });
      }

      setBookings(bRes.data || []);
      setPrevBookings(pRes.data || []);
      setQueueTickets(qRes.data || []);
      setPrevQueueTickets(pqRes.data || []);
      setReviews(rRes.data || []);
      setServices(sRes.data || []);
      setStaff(stRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [business, range]);

  const totalBookings = bookings.length;
  const prevTotal = prevBookings.length;
  const revenue = bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + (b.services?.price_dzd || 0), 0);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const prevRevenue = prevBookings.filter((b: any) => b.status === "completed").reduce((sum: number, b: any) => sum + (b.services?.price_dzd || 0), 0);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const successStatuses = new Set(["confirmed", "arrived", "in_service", "completed"]);
  const successCount = bookings.filter((b) => successStatuses.has(b.status)).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevSuccessCount = prevBookings.filter((b: any) => successStatuses.has(b.status)).length;
  const conversionRate = totalBookings > 0 ? (successCount / totalBookings) * 100 : 0;
  const prevConversionRate = prevTotal > 0 ? (prevSuccessCount / prevTotal) * 100 : 0;

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const totalQueueTickets = queueTickets.filter((t) => t.status !== "cancelled").length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevQueueTicketsCount = prevQueueTickets.filter((t: any) => t.status !== "cancelled").length;

  const completedTickets = queueTickets.filter((t) => t.status === "completed" && t.called_at && t.completed_at);
  const avgWaitTime = completedTickets.length > 0
    ? Math.round(completedTickets.reduce((sum, t) => {
        const wait = (new Date(t.completed_at!).getTime() - new Date(t.called_at!).getTime()) / 60000;
        return sum + wait;
      }, 0) / completedTickets.length)
    : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevCompletedTickets = prevQueueTickets.filter((t: any) => t.status === "completed" && t.called_at && t.completed_at);
  const prevAvgWaitTime = prevCompletedTickets.length > 0
    ? /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      Math.round(prevCompletedTickets.reduce((sum: number, t: any) => {
        const wait = (new Date(t.completed_at).getTime() - new Date(t.called_at).getTime()) / 60000;
        return sum + wait;
      }, 0) / prevCompletedTickets.length)
    : 0;

  const chartData = useMemo(() => {
    const { start, end } = getRange(range);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayBookings = bookings.filter((b) => b.date === dateStr);
      return {
        date: dateStr,
        completed: dayBookings.filter((b) => b.status === "completed").length,
        cancelled: dayBookings.filter((b) => b.status === "cancelled").length,
        noShow: dayBookings.filter((b) => b.status === "no_show").length,
      };
    });
  }, [bookings, range]);

  const queueChartData = useMemo(() => {
    const { start, end } = getRange(range);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayTickets = queueTickets.filter((t) => t.queue_date === dateStr);
      return {
        date: dateStr,
        joined: dayTickets.filter((t) => t.status !== "cancelled").length,
        completed: dayTickets.filter((t) => t.status === "completed").length,
      };
    });
  }, [queueTickets, range]);

  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      const d = parseISO(b.date);
      const day = d.getDay();
      const hour = parseInt(b.start_time?.split(":")[0] || "0");
      const key = `${day}-${hour}`;
      map[key] = (map[key] || 0) + 1;
    });
    queueTickets.forEach((t) => {
      const d = parseISO(t.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [bookings, queueTickets]);

  const serviceStats = useMemo(() => {
    const map: Record<string, { name: string; bookings: number; tickets: number }> = {};
    bookings.forEach((b) => {
      if (!b.service_id) return;
      if (!map[b.service_id]) map[b.service_id] = { name: b.services?.name || "Inconnu", bookings: 0, tickets: 0 };
      map[b.service_id].bookings++;
    });
    queueTickets.forEach((t) => {
      if (!t.service_id) return;
      if (!map[t.service_id]) map[t.service_id] = { name: t.services?.name || "Inconnu", bookings: 0, tickets: 0 };
      map[t.service_id].tickets++;
    });
    return Object.values(map).sort((a, b) => (b.bookings + b.tickets) - (a.bookings + a.tickets));
  }, [bookings, queueTickets]);

  const staffStats = useMemo(() => {
    const map: Record<string, { name: string; bookings: number; tickets: number }> = {};
    bookings.forEach((b) => {
      if (!b.staff_member_id) return;
      if (!map[b.staff_member_id]) map[b.staff_member_id] = { name: b.staff_members?.display_name || "Inconnu", bookings: 0, tickets: 0 };
      map[b.staff_member_id].bookings++;
    });
    queueTickets.forEach((t) => {
      if (!t.staff_member_id) return;
      if (!map[t.staff_member_id]) map[t.staff_member_id] = { name: "Inconnu", bookings: 0, tickets: 0 };
      map[t.staff_member_id].tickets++;
    });
    const staffNames = new Map(staff.map((s) => [s.id, s.display_name]));
    Object.entries(map).forEach(([id, stat]) => {
      const name = staffNames.get(id);
      if (name) stat.name = name;
    });
    return Object.values(map).sort((a, b) => (b.bookings + b.tickets) - (a.bookings + a.tickets));
  }, [bookings, queueTickets, staff]);

  const tableRows = useMemo(() => {
    const bookingRows = bookings.map((b) => ({
      id: b.id,
      type: "booking" as const,
      date: b.date,
      time: b.start_time,
      client_name: b.client_name,
      client_phone: b.client_phone,
      service_name: b.services?.name || null,
      staff_name: b.staff_members?.display_name || null,
      status: b.status,
    }));

    const queueRows = queueTickets.map((t) => ({
      id: t.id,
      type: "queue" as const,
      date: t.queue_date,
      time: t.created_at ? format(parseISO(t.created_at), "HH:mm") : "",
      client_name: t.client_name,
      client_phone: t.client_phone,
      service_name: t.services?.name || null,
      staff_name: null,
      status: t.status,
      label: t.ticket_label,
    }));

    return [...bookingRows, ...queueRows].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.time.localeCompare(a.time);
    });
  }, [bookings, queueTickets]);

  const rangeButtons: { key: Range; label: string }[] = [
    { key: "week", label: "Cette semaine" },
    { key: "month", label: "Ce mois" },
    { key: "3months", label: "3 derniers mois" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Analytiques</h2>
          <div className="flex gap-0.5 bg-[var(--bg-muted)] rounded-lg p-0.5">
            {rangeButtons.map((r) => (
              <Button
                key={r.key}
                variant={range === r.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setRange(r.key)}
                className="text-xs h-7"
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-lg" />
              <Skeleton className="h-72 rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            <MetricCards
              totalBookings={totalBookings}
              prevBookings={prevTotal}
              revenue={revenue}
              prevRevenue={prevRevenue}
              conversionRate={conversionRate}
              prevConversionRate={prevConversionRate}
              avgRating={avgRating}
              reviewCount={reviews.length}
              totalQueueTickets={totalQueueTickets}
              prevQueueTickets={prevQueueTicketsCount}
              avgWaitTime={avgWaitTime}
              prevAvgWaitTime={prevAvgWaitTime}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BookingsChart data={chartData} />
              <QueueChart data={queueChartData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PeakHoursGrid data={heatmapData} />
              <PopularServices data={serviceStats} />
            </div>

            <StaffPerformance data={staffStats} />

            <BookingHistoryTable data={tableRows} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;

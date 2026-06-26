import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessInfo } from "@/hooks/use-business-info";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MetricCards from "@/components/dashboard/analytics/MetricCards";
import BookingsChart from "@/components/dashboard/analytics/BookingsChart";
import PeakHoursGrid from "@/components/dashboard/analytics/PeakHoursGrid";
import PopularServices from "@/components/dashboard/analytics/PopularServices";
import BookingHistoryTable from "@/components/dashboard/analytics/BookingHistoryTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, subMonths as sub3, format, parseISO, differenceInDays, eachDayOfInterval, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Booking, Review, Service, StaffMember } from "@/types";

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
      
      const [bRes, pRes, rRes, sRes, stRes] = await Promise.all([
        supabase.from("bookings").select("id, date, start_time, end_time, status, created_at, service_id, staff_member_id, services(name, price_dzd, duration_minutes), staff_members(display_name)").eq("business_id", business.id).gte("date", fmt(start)).lte("date", fmt(end)).order("date", { ascending: false }),
        supabase.from("bookings").select("id, status, service_id, services(price_dzd)").eq("business_id", business.id).gte("date", fmt(prev.start)).lte("date", fmt(prev.end)),
        supabase.from("reviews").select("*").eq("business_id", business.id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        supabase.from("services").select("id, name").eq("business_id", business.id),
        supabase.from("staff_members").select("id, display_name").eq("business_id", business.id),
      ]);
      
      if (bRes.error) {
        if (import.meta.env.DEV) console.error('[DashboardAnalytics] failed to fetch bookings:', bRes.error.message);
        toast({ title: "Erreur", description: "Impossible de charger les réservations.", variant: "destructive" });
      }
      if (pRes.error) { if (import.meta.env.DEV) console.error('[DashboardAnalytics] failed to fetch prev bookings:', pRes.error.message); }
      if (rRes.error) {
        if (import.meta.env.DEV) console.error('[DashboardAnalytics] failed to fetch reviews:', rRes.error.message);
        toast({ title: "Erreur", description: "Impossible de charger les avis.", variant: "destructive" });
      }
      if (sRes.error) { if (import.meta.env.DEV) console.error('[DashboardAnalytics] failed to fetch services:', sRes.error.message); }
      if (stRes.error) { if (import.meta.env.DEV) console.error('[DashboardAnalytics] failed to fetch staff:', stRes.error.message); }
      
      setBookings(bRes.data || []);
      setPrevBookings(pRes.data || []);
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
  const prevRevenue = prevBookings.filter((b: any) => b.status === "completed").reduce((sum: number, b: any) => sum + (b.services?.price_dzd || 0), 0);
  const noShows = bookings.filter((b) => b.status === "no_show").length;
  const noShowRate = totalBookings > 0 ? (noShows / totalBookings) * 100 : 0;
  const prevNoShows = prevBookings.filter((b: any) => b.status === "no_show").length;
  const prevNoShowRate = prevTotal > 0 ? (prevNoShows / prevTotal) * 100 : 0;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const chartData = useMemo(() => {
    const { start, end } = getRange(range);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayBookings = bookings.filter((b) => b.date === dateStr);
      return {
        date: dateStr,
        completed: dayBookings.filter((b) => b.status === "completed").length,
        noShow: dayBookings.filter((b) => b.status === "no_show").length,
      };
    });
  }, [bookings, range]);

  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      const d = parseISO(b.date);
      const day = d.getDay();
      const hour = parseInt(b.start_time?.split(":")[0] || "0");
      const key = `${day}-${hour}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [bookings]);

  const serviceStats = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    bookings.forEach((b) => {
      if (!b.service_id) return;
      if (!map[b.service_id]) {
        map[b.service_id] = { name: b.services?.name || "Inconnu", count: 0, revenue: 0 };
      }
      map[b.service_id].count++;
      if (b.status === "completed") map[b.service_id].revenue += b.services?.price_dzd || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [bookings]);

  const tableRows = useMemo(() => {
    return bookings.map((b) => ({
      id: b.id,
      date: b.date,
      start_time: b.start_time,
      end_time: b.end_time,
      client_name: b.client_name,
      client_phone: b.client_phone,
      service_name: b.services?.name || null,
      staff_name: b.staff_members?.display_name || null,
      duration: b.services?.duration_minutes || null,
      price: b.services?.price_dzd || null,
      status: b.status,
    }));
  }, [bookings]);

  const rangeButtons: { key: Range; label: string }[] = [
    { key: "week", label: "Cette semaine" },
    { key: "month", label: "Ce mois" },
    { key: "3months", label: "3 derniers mois" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          <>
            <MetricCards
              totalBookings={totalBookings}
              prevBookings={prevTotal}
              revenue={revenue}
              prevRevenue={prevRevenue}
              noShowRate={noShowRate}
              prevNoShowRate={prevNoShowRate}
              avgRating={avgRating}
              reviewCount={reviews.length}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BookingsChart data={chartData} />
              <PeakHoursGrid data={heatmapData} />
            </div>
            <PopularServices data={serviceStats} />
            <BookingHistoryTable data={tableRows} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardAnalytics;

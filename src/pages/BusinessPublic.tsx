import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessHeader from "@/components/booking/BusinessHeader";
import AppointmentFlow from "@/components/booking/AppointmentFlow";
import QueueFlow from "@/components/booking/QueueFlow";

interface Business {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  is_active: boolean | null;
  address: string | null;
  wilaya_name: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  accepts_appointments: boolean | null;
  accepts_walkins: boolean | null;
  advance_booking_days: number | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_dzd: number | null;
}

interface BusinessHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean | null;
}

/**
 * Public business page — displays a business's profile, services, and booking/queue flows.
 * Uses the URL slug to fetch business data and shows appointment or walk-in tabs.
 * @returns The public business page JSX
 */
const BusinessPublic = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  
  // Read tab from URL params, default to queue
  const defaultTab = searchParams.get('tab') === 'appointment' ? 'appointment' : 'queue';
  const [activeTab, setActiveTab] = useState<"appointment" | "queue">(defaultTab);

  useEffect(() => {
    if (!slug) return;

    const fetchAll = async () => {
      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (bizError) {
        if (import.meta.env.DEV) console.error('[BusinessPublic] failed to fetch business:', bizError.message);
      }

      if (!biz) {
        navigate("/404", { replace: true });
        return;
      }

      setBusiness(biz as Business);

      const [servicesRes, hoursRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, duration_minutes, price_dzd")
          .eq("business_id", biz.id)
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("business_hours")
          .select("day_of_week, opens_at, closes_at, is_closed")
          .eq("business_id", biz.id),
      ]);

      if (servicesRes.error) {
        if (import.meta.env.DEV) console.error('[BusinessPublic] failed to fetch services:', servicesRes.error.message);
      }
      if (hoursRes.error) {
        if (import.meta.env.DEV) console.error('[BusinessPublic] failed to fetch hours:', hoursRes.error.message);
      }

      setServices((servicesRes.data ?? []) as Service[]);
      setHours((hoursRes.data ?? []) as BusinessHour[]);
      setLoading(false);
    };

    fetchAll();
  }, [slug, navigate]);

  // Set default tab based on business config (only if not already set by URL)
  useEffect(() => {
    if (business && !searchParams.get('tab')) {
      const showAppointments = business.accepts_appointments !== false;
      const showQueue = business.accepts_walkins !== false;
      if (activeTab === "queue" && !showQueue) setActiveTab("appointment");
      if (activeTab === "appointment" && !showAppointments) setActiveTab("queue");
    }
  }, [business, searchParams, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50">
          <Skeleton className="h-[140px] w-full" />
          <div className="px-5 pt-16 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!business) return null;

  if (!business.is_active) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50 flex items-center justify-center px-6 text-center">
          <div className="space-y-2">
            <p className="text-4xl">🚫</p>
            <h1 className="text-xl font-bold text-foreground">{t("booking:businessPublic.closedTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("booking:businessPublic.closedSubtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentDow = now.getDay();
  const currentHour = hours.find((h) => h.day_of_week === currentDow);
  let openStatus: { isOpen: boolean; closesAt: string | null } | null = null;
  if (currentHour) {
    if (currentHour.is_closed) {
      openStatus = { isOpen: false, closesAt: null };
    } else if (currentHour.opens_at && currentHour.closes_at) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [oh, om] = currentHour.opens_at.split(":").map(Number);
      const [ch, cm] = currentHour.closes_at.split(":").map(Number);
      const isOpen = nowMinutes >= oh * 60 + om && nowMinutes < ch * 60 + cm;
      openStatus = { isOpen, closesAt: currentHour.closes_at.slice(0, 5) };
    }
  }

  const showAppointments = business.accepts_appointments !== false;
  const showQueue = business.accepts_walkins !== false;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50">
        <BusinessHeader
          business={business}
          openStatus={openStatus}
        />

        {(showAppointments || showQueue) && (
          <>
            {/* Custom sticky tab bar */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-5">
              <div className="flex">
                {showAppointments && (
                  <button
                    onClick={() => setActiveTab("appointment")}
                    className={`flex-1 h-[44px] flex items-center justify-center text-[13px] font-medium border-b-2 transition-colors ${
                      activeTab === "appointment"
                        ? "text-foreground border-foreground"
                        : "text-muted-foreground border-transparent hover:text-foreground/70"
                    }`}
                  >
                    {t("booking:businessPublic.tabAppointment")}
                  </button>
                )}
                {showQueue && (
                  <button
                    onClick={() => setActiveTab("queue")}
                    className={`flex-1 h-[44px] flex items-center justify-center text-[13px] font-medium border-b-2 transition-colors ${
                      activeTab === "queue"
                        ? "text-foreground border-foreground"
                        : "text-muted-foreground border-transparent hover:text-foreground/70"
                    }`}
                  >
                    {t("booking:businessPublic.tabQueue")}
                  </button>
                )}
              </div>
            </div>

            {/* Info cards */}
            {activeTab === "appointment" && (
              <div className="px-5 pt-3 pb-1">
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground leading-relaxed">
                  {t("booking:businessPublic.infoAppointment")}
                </div>
              </div>
            )}
            {activeTab === "queue" && (
              <div className="px-5 pt-3 pb-1">
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground leading-relaxed">
                  {t("booking:businessPublic.infoQueue")}
                </div>
              </div>
            )}

            {/* Tab content */}
            {activeTab === "appointment" && showAppointments && (
              <AppointmentFlow
                businessId={business.id}
                businessName={business.name}
                services={services}
                businessHours={hours}
                advanceBookingDays={business.advance_booking_days ?? 14}
              />
            )}

            {activeTab === "queue" && showQueue && (
              <QueueFlow
                businessId={business.id}
                businessName={business.name}
                services={services}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default BusinessPublic;

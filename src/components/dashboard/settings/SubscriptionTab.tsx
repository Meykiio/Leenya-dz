import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, X, Check, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const pricingPlans = [
  {
    nameKey: "dashboard:settings.subscription.pricingModal.free",
    price: "0",
    featureKeys: [
      "dashboard:settings.subscription.features.free100bookings",
      "dashboard:settings.subscription.features.free300queue",
      "dashboard:settings.subscription.features.free3staff",
      "dashboard:settings.subscription.features.freeBasicQueue",
    ],
    current: true,
  },
  {
    nameKey: "dashboard:settings.subscription.pricingModal.pro",
    price: "4 900",
    featureKeys: [
      "dashboard:settings.subscription.features.pro500bookings",
      "dashboard:settings.subscription.features.pro1000queue",
      "dashboard:settings.subscription.features.pro7staff",
      "dashboard:settings.subscription.features.proSmsReminders",
      "dashboard:settings.subscription.features.proAdvancedAnalytics",
    ],
    highlight: true,
    comingSoon: true,
  },
  {
    nameKey: "dashboard:settings.subscription.pricingModal.business",
    price: "8 900",
    featureKeys: [
      "dashboard:settings.subscription.features.businessAllPro",
      "dashboard:settings.subscription.features.businessUnlimitedStaff",
      "dashboard:settings.subscription.features.businessPrioritySupport",
      "dashboard:settings.subscription.features.businessCustomApi",
    ],
  },
];

interface BusinessCounts {
  booking_count: number;
  queue_count: number;
  staff_count: number;
}

const LIMITS: Record<string, { maxBookings: number; maxQueue: number }> = {
  free: { maxBookings: 100, maxQueue: 300 },
  pro: { maxBookings: 500, maxQueue: 1000 },
  business: { maxBookings: 2000, maxQueue: 2000 },
};

export default function SubscriptionTab({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [counts, setCounts] = useState<BusinessCounts | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .select("plan, trial_ends_at")
        .eq("id", businessId)
        .maybeSingle();

      if (bizErr) {
        if (import.meta.env.DEV) console.error("[SubscriptionTab] failed to fetch business:", bizErr.message);
        toast({ title: t("common:toast.error"), description: t("common:toast.loadError"), variant: "destructive" });
        return;
      }

      if (business) {
        setPlan(business.plan);
        setTrialEndsAt(business.trial_ends_at);
      }

      await fetchCounts();
    };

    const fetchCounts = async () => {
      const { data: countsData, error: countsErr } = await supabase
        .rpc("get_monthly_business_counts", { p_business_id: businessId });

      if (countsErr) {
        if (import.meta.env.DEV) console.error("[SubscriptionTab] RPC error:", countsErr.message);
      } else {
        const row = Array.isArray(countsData) ? countsData[0] : countsData;
        setCounts(row as unknown as BusinessCounts);
      }
    };

    fetchData();

    const channel = supabase
      .channel("subscription-tab-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${businessId}` }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${businessId}` }, () => fetchCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, t]);

  const limits = plan ? LIMITS[plan] || LIMITS.free : LIMITS.free;

  const bookingUsagePct = counts !== null ? Math.min(100, Math.round((counts.booking_count / limits.maxBookings) * 100)) : 0;
  const queueUsagePct = counts !== null ? Math.min(100, Math.round((counts.queue_count / limits.maxQueue) * 100)) : 0;

  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isTrialActive = trialDaysLeft > 0;

  return (
    <div className="space-y-4">
      {/* Trial countdown */}
      {isTrialActive && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-500/10 p-2.5">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("dashboard:settings.subscription.trialActive")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("dashboard:settings.subscription.trialDaysLeft", { days: trialDaysLeft })}
                </p>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[11px]">
                {t("dashboard:settings.subscription.trialBadge")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("dashboard:settings.subscription.title")}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {plan ? t(`dashboard:settings.subscription.planLabels.${plan}`) : "—"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bookings progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("dashboard:settings.subscription.bookingsThisMonth")}</span>
              <span className="font-medium text-foreground">
                {counts !== null ? counts.booking_count : "—"} / {limits.maxBookings}
              </span>
            </div>
            <Progress value={bookingUsagePct} className="h-2" />
          </div>

          {/* Queue progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("dashboard:settings.subscription.queueThisMonth")}</span>
              <span className="font-medium text-foreground">
                {counts !== null ? counts.queue_count : "—"} / {limits.maxQueue}
              </span>
            </div>
            <Progress value={queueUsagePct} className="h-2" />
          </div>

          {isTrialActive && (
            <p className="text-xs text-muted-foreground">
              {t("dashboard:settings.subscription.trialNote")}
            </p>
          )}
          {!isTrialActive && counts !== null && (bookingUsagePct >= 80 || queueUsagePct >= 80) && (
            <p className="text-xs text-warning">{t("dashboard:settings.subscription.warning")}</p>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">{t("dashboard:settings.subscription.upgradeToPro")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard:settings.subscription.upgradeDesc")}
              </p>
              <Button className="mt-4" onClick={() => setShowPricingModal(true)}>
                {t("dashboard:settings.subscription.seePlans")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices section */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("dashboard:settings.subscription.invoices")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("dashboard:settings.subscription.noInvoices")}
          </p>
        </CardContent>
      </Card>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setShowPricingModal(false)} />
          <div className="relative w-full max-w-4xl">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1630] via-[#1f1a38] to-[#151128] shadow-2xl shadow-purple-500/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(123,57,252,0.12),transparent_50%)] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(123,57,252,0.08),transparent_50%)] pointer-events-none" />
              
              <div className="relative px-8 pt-10 pb-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{t("dashboard:settings.subscription.pricingModal.title")}</h3>
                    <p className="text-sm text-white/50 mt-1">{t("dashboard:settings.subscription.pricingModal.subtitle")}</p>
                  </div>
                  <button onClick={() => setShowPricingModal(false)} className="text-white/30 hover:text-white/80 transition-colors p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {pricingPlans.map((planItem, i) => (
                    <div
                      key={planItem.nameKey}
                      className={`relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                        planItem.highlight
                          ? "border-2 border-purple-500 shadow-lg shadow-purple-500/20 -mt-2 -mb-2"
                          : planItem.current
                          ? "border border-white/10 bg-white/5"
                          : "border border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      {planItem.highlight && (
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
                      )}
                      <div className="relative p-6 space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold ${planItem.highlight ? "text-purple-300" : "text-white/80"}`}>
                            {t(planItem.nameKey)}
                          </h4>
                          {planItem.current && (
                            <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{t("dashboard:settings.subscription.current")}</Badge>
                          )}
                          {planItem.highlight && (
                            <Badge className="text-[10px] bg-purple-500 text-white border-0">{t("dashboard:settings.subscription.popular")}</Badge>
                          )}
                        </div>

                        <div>
                          <span className="text-4xl font-bold text-white tracking-tight">{planItem.price}</span>
                          <span className="text-sm text-white/40 ml-1.5 rtl:ml-0 rtl:mr-1.5">{t("dashboard:settings.subscription.pricingModal.perMonth")}</span>
                        </div>

                        <ul className="space-y-3">
                          {planItem.featureKeys.map((fk) => (
                            <li key={fk} className="flex items-start gap-3">
                              <div className="rounded-full bg-purple-500/20 p-0.5 mt-0.5 shrink-0">
                                <Check className="h-3 w-3 text-purple-400" />
                              </div>
                              <span className="text-[13px] text-white/60">{t(fk)}</span>
                            </li>
                          ))}
                        </ul>

                        {!planItem.current && (
                          <Button
                            variant={planItem.highlight ? "default" : "ghost"}
                            size="sm"
                            disabled={planItem.comingSoon}
                            className={`w-full h-9 text-sm ${
                              planItem.highlight
                                ? "bg-purple-500 hover:bg-purple-600 text-white shadow-md shadow-purple-500/30 border-0 disabled:opacity-60 disabled:cursor-not-allowed"
                                : "bg-white/5 border border-white/10 text-white/80 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/40 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            }`}
                            onClick={() => {
                              setShowPricingModal(false);
                            }}
                          >
                            {planItem.comingSoon
                              ? t("dashboard:settings.subscription.pricingModal.comingSoon")
                              : i < pricingPlans.length - 1
                              ? t("common:buttons.choose")
                              : t("common:buttons.contact")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative px-8 py-4 border-t border-white/5">
                <p className="text-xs text-center text-white/30">
                  {t("dashboard:settings.subscription.pricingModal.limitNote")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

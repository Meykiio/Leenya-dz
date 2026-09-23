import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
    nameKey: "dashboard:settings.subscription.pricingModal.paid",
    price: "1 990",
    featureKeys: [
      "dashboard:settings.subscription.features.paidUnlimited",
      "dashboard:settings.subscription.features.paidReminders",
      "dashboard:settings.subscription.features.paidAnalytics",
      "dashboard:settings.subscription.features.paidSupport",
      "dashboard:settings.subscription.features.paidStaff",
    ],
    highlight: true,
  },
];

interface BusinessCounts {
  booking_count: number;
  queue_count: number;
  staff_count: number;
}

const LIMITS: Record<string, { maxBookings: number; maxQueue: number }> = {
  free: { maxBookings: 100, maxQueue: 300 },
  paid: { maxBookings: 5000, maxQueue: 5000 },
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
      {isTrialActive && (
        <Card className="border-[var(--badge-blue-border)] bg-[var(--accent-light)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[var(--accent-light)] border border-[var(--badge-blue-border)] p-2.5">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("dashboard:settings.subscription.trialActive")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {t("dashboard:settings.subscription.trialDaysLeft", { days: trialDaysLeft })}
                </p>
              </div>
              <Badge variant="outline" className="bg-[var(--badge-blue-bg)] text-[var(--badge-blue-fg)] border-[var(--badge-blue-border)]">
                {t("dashboard:settings.subscription.trialBadge")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.subscription.title")}</h3>
          <Badge variant="secondary">
            {plan ? t(`dashboard:settings.subscription.planLabels.${plan}`) : "—"}
          </Badge>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t("dashboard:settings.subscription.bookingsThisMonth")}</span>
              <span className="font-mono font-medium text-foreground">
                {counts !== null ? counts.booking_count : "—"} / {limits.maxBookings === 5000 ? "∞" : limits.maxBookings}
              </span>
            </div>
            <Progress value={bookingUsagePct} className="h-2" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t("dashboard:settings.subscription.queueThisMonth")}</span>
              <span className="font-mono font-medium text-foreground">
                {counts !== null ? counts.queue_count : "—"} / {limits.maxQueue === 5000 ? "∞" : limits.maxQueue}
              </span>
            </div>
            <Progress value={queueUsagePct} className="h-2" />
          </div>

          {isTrialActive && (
            <p className="text-xs text-[var(--text-secondary)]">
              {t("dashboard:settings.subscription.trialNote")}
            </p>
          )}
        </div>
      </section>

      {/* Upgrade CTA */}
      {plan !== "paid" && (
        <Card className="border-primary/30 bg-[var(--accent-light)]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-[var(--accent-light)] border border-[var(--badge-blue-border)] p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-foreground tracking-[-0.015em]">{t("dashboard:settings.subscription.upgradeToPaid")}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {t("dashboard:settings.subscription.upgradeDesc")}
                </p>
                <Button className="mt-4" onClick={() => setShowPricingModal(true)}>
                  {t("dashboard:settings.subscription.seePlans")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="border-b border-[var(--border-default)] pb-2.5">
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-[-0.015em]">{t("dashboard:settings.subscription.invoices")}</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] text-center py-6">
          {t("dashboard:settings.subscription.noInvoices")}
        </p>
      </section>

      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="absolute inset-0 bg-[rgba(9,13,22,0.7)]" onClick={() => setShowPricingModal(false)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-primary bg-card shadow-lg overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">{t("dashboard:settings.subscription.pricingModal.title")}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{t("dashboard:settings.subscription.pricingModal.subtitle")}</p>
              </div>
              <button onClick={() => setShowPricingModal(false)} aria-label={t("common:nav.close")} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {pricingPlans.map((planItem) => (
                  <div
                    key={planItem.nameKey}
                    className={`relative flex flex-col rounded-2xl border bg-card transition-all duration-med hover:-translate-y-[3px] hover:shadow-md ${
                      planItem.highlight ? "border-primary" : "border-[var(--border-default)]"
                    }`}
                  >
                    <div className="p-6 space-y-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-base font-bold text-primary tracking-[-0.015em]">
                          {t(planItem.nameKey)}
                        </h4>
                        {planItem.current && (
                          <Badge variant="outline">{t("dashboard:settings.subscription.current")}</Badge>
                        )}
                        {planItem.highlight && (
                          <Badge className="bg-primary text-primary-foreground border-transparent">{t("dashboard:settings.subscription.popular")}</Badge>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-[28px] font-medium text-foreground tracking-[-0.02em]">{planItem.price}</span>
                        {planItem.price !== "0" && (
                          <span className="text-[13px] text-[var(--text-secondary)]">{t("dashboard:settings.subscription.pricingModal.perMonth")}</span>
                        )}
                      </div>

                      <ul className="space-y-0 flex-1">
                        {planItem.featureKeys.map((fk) => (
                          <li key={fk} className="flex items-center gap-2 border-b border-[var(--border-default)] py-1.5 last:border-b-0">
                            <div className="rounded-full bg-[var(--success-bg)] p-0.5 shrink-0">
                              <Check className="h-3 w-3 text-[var(--success)]" />
                            </div>
                            <span className="text-[13px] text-[var(--text-secondary)]">{t(fk)}</span>
                          </li>
                        ))}
                      </ul>

                      {!planItem.current && (
                        <Button
                          variant={planItem.highlight ? "default" : "outline"}
                          className="w-full h-11 mt-auto"
                          onClick={() => {
                            setShowPricingModal(false);
                          }}
                        >
                          {t("common:buttons.choose")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-center text-[var(--text-secondary)]">
                {t("dashboard:settings.subscription.pricingModal.limitNote")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
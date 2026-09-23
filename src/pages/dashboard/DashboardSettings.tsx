import { useTranslation } from "react-i18next";
import { useBusinessInfo } from "@/hooks/use-business-info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessInfoTab from "@/components/dashboard/settings/BusinessInfoTab";
import HoursTab from "@/components/dashboard/settings/HoursTab";
import BookingPrefsTab from "@/components/dashboard/settings/BookingPrefsTab";
import AccountTab from "@/components/dashboard/settings/AccountTab";
import SubscriptionTab from "@/components/dashboard/settings/SubscriptionTab";
import SettingsWhatsApp from "./SettingsWhatsApp";
import { Building2, Clock, CalendarCog, UserCog, Sparkles, MessageCircle } from "lucide-react";

/**
 * Dashboard settings — tabbed page for business info, hours, booking preferences,
 * WhatsApp integration, account settings, and subscription management.
 * @returns The settings page JSX
 */
const DashboardSettings = () => {
  const { t } = useTranslation();
  const { business, loading } = useBusinessInfo();

  if (loading) {
    return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <h2 className="font-display text-xl font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">{t("dashboard:settings.title")}</h2>

        <Tabs defaultValue="business" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1.5 bg-[var(--bg-muted)] p-1.5 rounded-[8px]">
            <TabsTrigger value="business" className="gap-1.5 text-xs h-8">
              <Building2 className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.business")}
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1.5 text-xs h-8">
              <Clock className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.hours")}
            </TabsTrigger>
            <TabsTrigger value="prefs" className="gap-1.5 text-xs h-8">
              <CalendarCog className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.prefs")}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs h-8">
              <MessageCircle className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.whatsapp")}
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 text-xs h-8">
              <UserCog className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.account")}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1.5 text-xs h-8">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> {t("dashboard:settings.tab.subscription")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            {business && <BusinessInfoTab businessId={business.id} />}
          </TabsContent>
          <TabsContent value="hours">
            {business && <HoursTab businessId={business.id} />}
          </TabsContent>
          <TabsContent value="prefs">
            {business && <BookingPrefsTab businessId={business.id} />}
          </TabsContent>
          <TabsContent value="whatsapp">
            {business && <SettingsWhatsApp />}
          </TabsContent>
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>
          <TabsContent value="subscription">
            {business && <SubscriptionTab businessId={business.id} />}
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default DashboardSettings;

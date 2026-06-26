import { useBusinessInfo } from "@/hooks/use-business-info";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessInfoTab from "@/components/dashboard/settings/BusinessInfoTab";
import HoursTab from "@/components/dashboard/settings/HoursTab";
import BookingPrefsTab from "@/components/dashboard/settings/BookingPrefsTab";
import AccountTab from "@/components/dashboard/settings/AccountTab";
import SubscriptionTab from "@/components/dashboard/settings/SubscriptionTab";
import SettingsWhatsApp from "./SettingsWhatsApp";
import { Building2, Clock, CalendarCog, UserCog, Sparkles, MessageCircle } from "lucide-react";

const DashboardSettings = () => {
  const { business, loading } = useBusinessInfo();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-3xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Paramètres</h2>

        <Tabs defaultValue="business" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-0.5 bg-[var(--bg-muted)] p-0.5 rounded-lg">
            <TabsTrigger value="business" className="gap-1.5 text-xs h-7">
              <Building2 className="h-3.5 w-3.5" /> Entreprise
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1.5 text-xs h-7">
              <Clock className="h-3.5 w-3.5" /> Horaires
            </TabsTrigger>
            <TabsTrigger value="prefs" className="gap-1.5 text-xs h-7">
              <CalendarCog className="h-3.5 w-3.5" /> Réservation
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs h-7">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 text-xs h-7">
              <UserCog className="h-3.5 w-3.5" /> Compte
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1.5 text-xs h-7">
              <Sparkles className="h-3.5 w-3.5" /> Abonnement
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
    </DashboardLayout>
  );
};

export default DashboardSettings;

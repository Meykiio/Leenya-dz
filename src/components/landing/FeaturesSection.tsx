import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Users, BarChart3, Check } from "lucide-react";
import CalendarDemo from "@/components/landing/demo/CalendarDemo";
import QueueDemo from "@/components/landing/demo/QueueDemo";
import DashboardDemo from "@/components/landing/demo/DashboardDemo";
import { useTranslation } from "react-i18next";

const tabs = [
  { id: "bookings", labelKey: "features.tab.bookings", icon: CalendarDays },
  { id: "queue", labelKey: "features.tab.queue", icon: Users },
  { id: "dashboard", labelKey: "features.tab.dashboard", icon: BarChart3 },
];

const content: Record<string, { titleKey: string; benefitKeys: string[] }> = {
  bookings: {
    titleKey: "features.bookings.title",
    benefitKeys: [
      "features.bookings.benefit1",
      "features.bookings.benefit2",
      "features.bookings.benefit3",
    ],
  },
  queue: {
    titleKey: "features.queue.title",
    benefitKeys: [
      "features.queue.benefit1",
      "features.queue.benefit2",
      "features.queue.benefit3",
    ],
  },
  dashboard: {
    titleKey: "features.dashboard.title",
    benefitKeys: [
      "features.dashboard.benefit1",
      "features.dashboard.benefit2",
      "features.dashboard.benefit3",
    ],
  },
};

const demos: Record<string, React.ReactNode> = {
  bookings: <CalendarDemo />,
  queue: <QueueDemo />,
  dashboard: <DashboardDemo />,
};

export default function FeaturesSection() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("bookings");

  return (
    <section id="features" className="py-20 px-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-foreground tracking-tight mb-3">
            {t("landing:features.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {t("landing:features.subtitle")}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t("landing:" + tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
          >
            {/* Text side */}
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight mb-4">
                {t("landing:" + content[activeTab].titleKey)}
              </h3>
              <ul className="space-y-2.5 mb-6">
                {content[activeTab].benefitKeys.map((bk) => (
                  <li key={bk} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-sm text-muted-foreground">{t("landing:" + bk)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Demo side */}
            <div className="relative">
              <div
                className="rounded-xl overflow-hidden transition-all duration-500"
                style={{
                  border: "1px solid var(--border-default)",
                  background: "#141413",
                  boxShadow: "0 0 60px rgba(99,102,241,0.06), 0 20px 60px rgba(0,0,0,0.08)",
                }}
              >
                <div className="h-7 bg-[#1C1C1A] border-b border-white/[0.06] flex items-center px-3 gap-1.5">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-white/[0.12]" />
                    <div className="h-2 w-2 rounded-full bg-white/[0.12]" />
                    <div className="h-2 w-2 rounded-full bg-white/[0.08]" />
                  </div>
                </div>
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {demos[activeTab]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

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
    <section id="features" className="py-12 px-6 bg-background relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h2 className="font-display text-[28px] font-extrabold text-foreground tracking-[-0.02em] mb-3">
            {t("landing:features.title")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            {t("landing:features.subtitle")}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <div className="inline-flex items-center gap-1 bg-[var(--bg-muted)] rounded-[8px] p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[5px] text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-foreground"
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
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
          >
            {/* Text side */}
            <div>
              <h3 className="font-display text-xl font-bold text-foreground tracking-[-0.02em] mb-4">
                {t("landing:" + content[activeTab].titleKey)}
              </h3>
              <ul className="space-y-2.5 mb-6">
                {content[activeTab].benefitKeys.map((bk) => (
                  <li key={bk} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-full bg-[var(--accent-light)] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">{t("landing:" + bk)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Demo side — the demo register stays dark, like the product board */}
            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden transition-all duration-med"
                style={{
                  border: "1px solid #263044",
                  background: "#1A2235",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="h-7 bg-[#1F2A3F] border-b border-[#263044] flex items-center px-3 gap-1.5">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-[#3A4D6A]" />
                    <div className="h-2 w-2 rounded-full bg-[#3A4D6A]" />
                    <div className="h-2 w-2 rounded-full bg-[#263044]" />
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
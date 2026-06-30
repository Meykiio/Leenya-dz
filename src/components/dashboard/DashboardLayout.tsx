import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessInfo, getAdminBusinessId, clearAdminBusinessId } from "@/hooks/use-business-info";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  CalendarDays,
  Users2,
  Scissors,
  UserCheck,
  BarChart2,
  Settings2,
  MessageSquareText,
  LogOut,
  Menu,
  X,
  Copy,
  Building2,
} from "lucide-react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import FloatingHelp from "@/components/FloatingHelp";

const mainNav = [
  { to: "/dashboard", labelKey: "dashboard:nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/bookings", labelKey: "dashboard:nav.bookings", icon: CalendarDays, pending: true },
  { to: "/dashboard/queue", labelKey: "dashboard:nav.queue", icon: Users2, live: true },
  { to: "/dashboard/services", labelKey: "dashboard:nav.services", icon: Scissors },
  { to: "/dashboard/staff", labelKey: "dashboard:nav.staff", icon: UserCheck },
];

const secondaryNav = [
  { to: "/dashboard/analytics", labelKey: "dashboard:nav.analytics", icon: BarChart2 },
  { to: "/dashboard/feedback", labelKey: "dashboard:nav.feedback", icon: MessageSquareText },
  { to: "/dashboard/settings", labelKey: "dashboard:nav.settings", icon: Settings2 },
];

const allNav = [...mainNav, ...secondaryNav];

import { Suspense } from "react";

/** @description Owner dashboard shell with responsive sidebar navigation, mobile drawer, bottom nav, live queue/pending badges, user profile, and copy-business-link action. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { business } = useBusinessInfo();
  const isAdminMode = role === "superadmin" && !!getAdminBusinessId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || t("common:user");

  // Fetch and subscribe to live queue count
  useEffect(() => {
    if (!business) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("queue_tickets")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("queue_date", today)
        .eq("status", "waiting");
      if (!error) setQueueCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel("sidebar-queue-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${business.id}` }, () => {
        fetchCount();
      })
      .subscribe();

    const fetchPendingCount = async () => {
      if (!business) return;
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("date", format(new Date(), "yyyy-MM-dd"))
        .eq("status", "pending");
      if (!error) setPendingCount(count || 0);
    };

    fetchPendingCount();

    const bookingChannel = supabase
      .channel("sidebar-pending-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${business.id}` }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(bookingChannel);
    };
  }, [business]);

  const copyLink = async () => {
    if (!business) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    toast({ title: t("dashboard:nav.linkCopied") });
  };

  const navItemClasses = "flex items-center gap-2 rounded-[6px] px-2.5 h-8 text-[13px] font-medium transition-all duration-150";
  const navDefault = `${navItemClasses} text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]`;
  const navActive = "bg-[var(--accent-light)] text-[var(--accent)]";

  const renderNavSection = (items: typeof mainNav, label?: string) => (
    <>
      {label && (
        <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)]">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={navDefault}
          activeClassName={navActive}
          onClick={() => setMobileOpen(false)}
        >
          <item.icon className="h-[15px] w-[15px] shrink-0" />
          <span className="flex-1">{t(item.labelKey)}</span>
          {item.live && queueCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-white font-mono text-[10px] font-semibold px-1">
              {queueCount > 99 ? "99+" : queueCount}
            </span>
          )}
          {item.pending && pendingCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--warning)] text-white font-mono text-[10px] font-semibold px-1">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-3 pt-3 pb-3 flex items-center gap-2">
        <img src="/logo.svg" alt="Leenya" className="size-7 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Leenya</h1>
            {isAdminMode && (
              <span className="text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded-[4px] leading-none">
                Admin
              </span>
            )}
          </div>
          {business && (
            <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[140px] mt-0.5">
              {business.name}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-2.5 border-t border-[var(--border-default)] mb-2" />

      {/* Nav */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {renderNavSection(mainNav)}
        <div className="mx-0 my-2 border-t border-[var(--border-default)]" />
        {renderNavSection(secondaryNav)}
        {isAdminMode && (
          <>
            <div className="mx-0 my-2 border-t border-[var(--border-default)]" />
            <button
              onClick={() => {
                clearAdminBusinessId();
                navigate("/admin");
              }}
              className={navDefault + " w-full"}
            >
              <Building2 className="h-[15px] w-[15px] shrink-0" />
              <span className="flex-1">{t("dashboard:nav.allBusinesses")}</span>
            </button>
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="px-2.5 pb-3 pt-2.5 border-t border-[var(--border-default)]">
        {isAdminMode && (
          <button
            onClick={() => {
              clearAdminBusinessId();
              navigate("/dashboard");
            }}
            className="flex items-center gap-2 w-full mb-2 rounded-[6px] px-2.5 h-8 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-overlay)] transition-all duration-150"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            <span>{t("dashboard:nav.exitAdmin")}</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <img
            src={generatePixelAvatar(profileName, 28)}
            alt=""
            className="h-7 w-7 rounded-full shrink-0"
          />
          <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">{profileName}</span>
          <button
            onClick={signOut}
            className="text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors p-0.5"
            title={t("dashboard:nav.logout")}
          >
            <LogOut className="h-[13px] w-[13px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[220px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 rtl:lg:left-auto rtl:lg:right-0 bg-[var(--bg-subtle)] border-r border-[var(--border-default)] rtl:border-l rtl:border-r-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--bg-subtle)] border-r border-[var(--border-default)] rtl:left-auto rtl:right-0 rtl:border-l rtl:border-r-0">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rtl:right-auto rtl:left-3">
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-[220px] rtl:lg:pr-[220px] rtl:lg:pl-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-[50px] border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] hidden sm:inline">
              {format(new Date(), "EEEE d MMMM", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {business && (
              <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-[var(--text-tertiary)] text-xs hidden sm:flex">
                <Copy className="h-3.5 w-3.5" /> {t("dashboard:nav.copyLink")}
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-6 w-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div></div>}>
            {children}
          </Suspense>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-default)] bg-[var(--bg-base)] flex items-center justify-around py-2">
          {allNav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              end={(item as any).end}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-[var(--text-tertiary)]"
              activeClassName="text-[var(--accent)]"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{t(item.labelKey).split(" ")[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <FloatingHelp />
    </div>
  );
}

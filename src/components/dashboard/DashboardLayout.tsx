import { useEffect, useState, useRef, useLayoutEffect, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessInfo, getAdminBusinessId, clearAdminBusinessId } from "@/hooks/use-business-info";
import { useTheme } from "@/hooks/useTheme";
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
  Sun,
  Moon,
} from "lucide-react";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import LoadingScreen from "@/components/LoadingScreen";

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

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  live?: boolean;
  pending?: boolean;
}

/** @description Owner dashboard shell with responsive sidebar navigation, mobile drawer, bottom nav, live queue/pending badges, user profile, and copy-business-link action. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { business } = useBusinessInfo();
  const isAdminMode = role === "superadmin" && !!getAdminBusinessId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) setProfileFullName(data.full_name);
    });
  }, [user]);

  const profileName = profileFullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || t("common:user");

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

  // The 2px signal line that tracks the active nav item (slides with spring)
  useLayoutEffect(() => {
    const update = () => {
      const container = navRef.current;
      if (!container) return;
      const active = container.querySelector<HTMLElement>('[data-nav-active="true"]');
      if (!active) {
        setIndicator(null);
        return;
      }
      setIndicator({ top: active.offsetTop, height: active.offsetHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [pathname]);

  // Lock page scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const copyLink = async () => {
    if (!business) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    toast({ title: t("dashboard:nav.linkCopied") });
  };

  const isItemActive = (item: NavItem) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");

  const navItemClasses =
    "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 mb-px relative z-[1] text-[13px] font-medium transition-all duration-150";
  const navDefault = `${navItemClasses} text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] hover:translate-x-[2px] rtl:hover:-translate-x-[2px]`;
  const navActive = "text-primary font-semibold";

  const renderNavSection = (items: NavItem[], label?: string) => (
    <>
      {label && (
        <p className="px-2.5 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--border-strong)]">
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
          data-nav-active={isItemActive(item) ? "true" : undefined}
          onClick={() => setMobileOpen(false)}
        >
          <item.icon className="h-[15px] w-[15px] shrink-0 opacity-60" />
          <span className="flex-1">{t(item.labelKey)}</span>
          {item.live && queueCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-[2px] bg-primary text-primary-foreground font-mono text-[10px] font-medium px-1">
              {queueCount > 99 ? "99+" : queueCount}
            </span>
          )}
          {item.pending && pendingCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-[2px] bg-[var(--warning)] text-white font-mono text-[10px] font-medium px-1">
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
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5 border-b border-[var(--border-default)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-primary font-mono text-[15px] font-medium text-primary-foreground tracking-[-0.04em] shrink-0">
          Ln
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-[18px] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">
              Leenya<span className="text-[var(--signal)]">.</span>
            </h1>
            {isAdminMode && (
              <span className="text-[10px] font-semibold text-primary bg-[var(--accent-light)] px-1.5 py-0.5 rounded-[2px] font-mono uppercase leading-none">
                Admin
              </span>
            )}
          </div>
          {business && (
            <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[160px] mt-1">
              {business.name}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav ref={navRef} className="relative flex-1 px-2.5 pb-5 overflow-y-auto">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-0 w-[2px] rounded-e-[1px] bg-[var(--signal)] transition-all duration-slow [transition-timing-function:cubic-bezier(.34,1.22,.64,1)] motion-reduce:transition-none"
          style={{ top: indicator?.top ?? 0, height: indicator?.height ?? 0, opacity: indicator ? 1 : 0 }}
        />
        {renderNavSection(mainNav, t("dashboard:nav.groupManage"))}
        <div className="mx-0 my-4 border-t border-[var(--border-default)]" />
        {renderNavSection(secondaryNav, t("dashboard:nav.groupInsights"))}
        {isAdminMode && (
          <>
            <div className="mx-0 my-4 border-t border-[var(--border-default)]" />
            <button
              onClick={() => {
                clearAdminBusinessId();
                navigate("/admin");
              }}
              className={navDefault + " w-full"}
            >
              <Building2 className="h-[15px] w-[15px] shrink-0 opacity-60" />
              <span className="flex-1 text-left">{t("dashboard:nav.allBusinesses")}</span>
            </button>
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3.5 py-3 border-t border-[var(--border-default)]">
        {isAdminMode && (
          <button
            onClick={() => {
              clearAdminBusinessId();
              navigate("/dashboard");
            }}
            className="flex items-center gap-2.5 w-full mb-2 rounded-[8px] px-2.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--bg-muted)] transition-all duration-150"
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
            onClick={toggleTheme}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--accent)] transition-all hover:border-[var(--accent)] hover:rotate-[14deg] shrink-0"
            title={t("common:theme.toggle")}
            aria-label={t("common:theme.toggle")}
          >
            {theme === "dark" ? <Sun className="h-[13px] w-[13px]" /> : <Moon className="h-[13px] w-[13px]" />}
          </button>
          <button
            onClick={signOut}
            className="text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors p-0.5"
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
      <aside className="hidden lg:flex lg:w-[272px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 rtl:lg:left-auto rtl:lg:right-0 bg-[var(--nav-bg)] border-r border-[var(--border-default)] rtl:border-l rtl:border-r-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer — always mounted for a smooth slide */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
        style={mobileOpen ? undefined : { visibility: "hidden", transition: "visibility 0s linear 480ms" }}
      >
        <div
          className={`absolute inset-0 bg-[rgba(9,13,22,0.7)] transition-opacity duration-med ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[min(300px,86vw)] bg-[var(--nav-bg)] border-r border-[var(--border-default)] shadow-lg overflow-y-auto transition-transform duration-slow [transition-timing-function:cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none rtl:left-auto rtl:right-0 rtl:border-l rtl:border-r-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
          }`}
        >
          <button onClick={() => setMobileOpen(false)} aria-label={t("common:nav.close")} className="absolute top-3 right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rtl:right-auto rtl:left-3 z-10">
            <X className="h-5 w-5" />
          </button>
          {sidebarContent}
        </aside>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-[272px] rtl:lg:pr-[272px] rtl:lg:pl-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-[60px] border-b border-[var(--border-default)] bg-[var(--nav-bg)] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-foreground" aria-label={t("common:nav.menu")} onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] hidden sm:inline">
              {format(new Date(), "EEEE d MMMM", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {business && (
              <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 text-[var(--text-secondary)] text-xs hidden sm:flex">
                <Copy className="h-3.5 w-3.5" /> {t("dashboard:nav.copyLink")}
              </Button>
            )}
            <button
              onClick={toggleTheme}
              className="flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--accent)] transition-all hover:border-[var(--accent)] hover:rotate-[14deg] lg:hidden"
              title={t("common:theme.toggle")}
              aria-label={t("common:theme.toggle")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full mx-auto max-w-[1080px] p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          <Suspense fallback={<LoadingScreen fullScreen={false} />}>
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </Suspense>
        </main>

        {/* Mobile bottom nav — icons only */}
        <nav aria-label={t("dashboard:nav.label")} className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-default)] bg-[var(--nav-bg)] flex items-center pt-1 pb-[env(safe-area-inset-bottom)] px-1">
          {allNav.map((item) => {
            const badge = item.live && queueCount > 0 ? queueCount : item.pending && pendingCount > 0 ? pendingCount : 0;
            const badgeClass = item.live ? "bg-primary" : "bg-[var(--warning)]";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                end={(item as any).end}
                className="relative flex flex-1 items-center justify-center py-2 text-[var(--text-secondary)]"
                activeClassName="text-primary"
                aria-label={t(item.labelKey)}
                title={t(item.labelKey)}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className={`absolute -top-1 -end-1.5 inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-[2px] text-white font-mono text-[9px] px-0.5 ${badgeClass}`}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
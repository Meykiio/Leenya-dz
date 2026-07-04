import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Play, CheckCircle, XCircle, Users, LogOut, Ticket,
  CalendarDays, MessageCircle, Clock, ArrowRight, UserCheck,
  Phone,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { openWhatsApp, buildQueueCalledUrl, buildBookingConfirmationUrl } from "@/lib/whatsapp";
import { generatePixelAvatar } from "@/lib/pixel-avatar";
import { useWebPush } from "@/hooks/useWebPush";
import type { Business, QueueTicket, Booking } from "@/types";
import type { BookingStatus } from "@/integrations/supabase/types";

type Tab = "queue" | "bookings";

const StaffView = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { sendPush } = useWebPush();
  const [business, setBusiness] = useState<Pick<Business, "id" | "name" | "slug"> | null>(null);
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState<Tab>("queue");
  const today = format(new Date(), "yyyy-MM-dd");
  const calledRef = useRef<HTMLDivElement>(null);
  const inServiceRef = useRef<HTMLDivElement>(null);
  const waitingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("staff_members")
      .select("id, display_name, business_id, businesses(id, name, slug)")
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (import.meta.env.DEV) console.error('[StaffView] failed to fetch business:', error.message);
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        if (data) {
          setBusiness(data.businesses);
          setStaffMemberId(data.id);
          setStaffName(data.display_name);
        } else {
          setAccessDenied(true);
          setLoading(false);
        }
      });
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!business || !staffMemberId) return;
    const { data, error } = await supabase
      .rpc("get_staff_queue", { p_staff_member_id: staffMemberId, p_queue_date: today });

    if (error) { if (import.meta.env.DEV) console.error("fetchTickets:", error); toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.queueLoadError"), variant: "destructive" }); }
    const mapped = (data || []).map((t: Record<string, unknown>) => ({
      ...t,
      services: t.service_name ? { name: t.service_name } : null,
    }));
    setTickets(mapped as unknown as QueueTicket[]);
    setLoading(false);
  }, [business, staffMemberId, today, t]);

  const fetchBookings = useCallback(async () => {
    if (!business || !staffMemberId) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name), staff_members(display_name)")
      .eq("business_id", business.id)
      .eq("date", today)
      .in("status", ["pending", "confirmed", "arrived", "in_service"])
      .or("staff_member_id.eq." + staffMemberId + ",staff_member_id.is.null")
      .order("start_time");

    if (error) { if (import.meta.env.DEV) console.error("fetchBookings:", error); toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.bookingsLoadError"), variant: "destructive" }); }
    setBookings(data || []);
    setLoading(false);
  }, [business, staffMemberId, today, t]);

  useEffect(() => {
    if (!business) return;
    fetchTickets();
    fetchBookings();
    const channel = supabase
      .channel("staff-view")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${business.id}` }, () => fetchTickets())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${business.id}` }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [business, fetchTickets, fetchBookings]);

  const sendBackToQueue = async (id: string) => {
    const { error } = await supabase.rpc("send_ticket_back_to_queue", { p_ticket_id: id });
    if (error) { if (import.meta.env.DEV) console.error("sendBackToQueue:", error); toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.updateError"), variant: "destructive" }); }
    fetchTickets();
  };

  const updateTicketStatus = async (id: string, status: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const currentStatus = ticket.status;

    const updates: Record<string, unknown> = { status };
    if (status === "called") {
      updates.called_at = new Date().toISOString();
      if (!ticket.staff_member_id) updates.staff_member_id = staffMemberId;
    }
    if (status === "completed" || status === "no_show") updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("queue_tickets")
      .update(updates)
      .eq("business_id", business!.id)
      .eq("id", id)
      .eq("status", currentStatus)
      .select("client_phone, ticket_label");

    if (error) {
      if (import.meta.env.DEV) console.error("updateTicketStatus:", error);
      toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.updateError"), variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: t("staff:staffView.toast.ticketTaken"), description: t("staff:staffView.toast.ticketTakenDesc"), variant: "destructive" });
      fetchTickets();
      return;
    }
    if (status === "called") {
      const ticketData = data[0];
      const serviceName = ticket.services?.name || t("staff:staffView.serviceDefault");
      const url = buildQueueCalledUrl(ticketData.client_phone, business!.name, ticketData.ticket_label, serviceName);
      openWhatsApp(url);

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription, locale")
        .eq("queue_ticket_id", id);
      if (subs && subs.length > 0) {
        for (const sub of subs) {
          await sendPush(sub.subscription, {
            title: t("common:push.queueCalled"),
            body: t("common:push.queueCalledBody", { business: business!.name, ticket: ticketData.ticket_label }),
            url: `/booking/track/${id}`,
          });
        }
      }
    }
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const currentStatus = booking.status;

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("business_id", business!.id)
      .eq("id", id)
      .eq("status", currentStatus);

    if (error) {
      if (import.meta.env.DEV) console.error("updateBookingStatus:", error);
      toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.updateError"), variant: "destructive" });
      return;
    }
    fetchBookings();
  };

  const sendBookingWhatsApp = (booking: Booking) => {
    const serviceName = (booking.services as unknown as { name?: string })?.name || t("staff:staffView.serviceDefault");
    const url = buildBookingConfirmationUrl(
      booking.client_phone, business!.name, booking.date,
      booking.start_time.slice(0, 5), serviceName, null, booking.id
    );
    openWhatsApp(url);
  };

  const waiting = tickets.filter((t) => t.status === "waiting");
  const called = tickets.filter((t) => t.status === "called");
  const inService = tickets.filter((t) => t.status === "in_service");

  const timeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const mins = differenceInMinutes(new Date(), d);
    return mins < 1 ? t("staff:staffView.timeJustNow") : t("staff:staffView.timeMin", { mins });
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const StatCard = ({ label, count, icon: Icon, color, sectionRef }: {
    label: string; count: number; icon: React.ElementType; color: string; ref?: React.RefObject<HTMLDivElement | null>;
  }) => (
    <button
      onClick={() => sectionRef && scrollToSection(sectionRef)}
      className={`flex flex-col items-center justify-center rounded-xl ${color} p-3 min-h-[72px] active:scale-95 transition-transform`}
    >
      <Icon className="h-5 w-5 mb-0.5 opacity-70" />
      <span className="text-xl font-bold leading-tight">{count}</span>
      <span className="text-[10px] font-medium opacity-80">{label}</span>
    </button>
  );

  const TicketCard = ({ ticket, actions }: { ticket: QueueTicket; actions: React.ReactNode }) => (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-3.5 shadow-sm">
      {ticket.checked_in_at && (
        <div className="shrink-0" title={t("staff:staffView.checkedIn")}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">✓</span>
        </div>
      )}
      <div className="flex flex-col items-center justify-center min-w-[48px]">
        <span className="font-mono text-lg font-bold text-[var(--accent)] leading-none">{ticket.ticket_label}</span>
        <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{t("staff:staffView.since")} {timeAgo(ticket.called_at || ticket.created_at)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{ticket.client_name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{ticket.services?.name || "—"}</p>
        {ticket.client_phone && (
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{ticket.client_phone}</p>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {actions}
      </div>
    </div>
  );

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const statusColors: Record<string, string> = {
      pending: "border-amber-200 bg-amber-50 text-amber-700",
      confirmed: "border-blue-200 bg-blue-50 text-blue-700",
      arrived: "border-green-200 bg-green-50 text-green-700",
      in_service: "border-purple-200 bg-purple-50 text-purple-700",
    };
    const statusClass = statusColors[booking.status] || "";
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-3.5 shadow-sm">
        <div className="flex flex-col items-center min-w-[44px] pt-0.5">
          <span className="text-sm font-bold text-[var(--text-primary)]">{booking.start_time.slice(0, 5)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{booking.client_name}</p>
          <p className="text-xs text-[var(--text-secondary)]">{booking.services?.name || "—"}</p>
          {booking.client_phone && (
            <p className="text-[10px] text-[var(--text-tertiary)]">{booking.client_phone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
            {booking.status === "pending" ? t("staff:staffView.statusPending") :
             booking.status === "confirmed" ? t("staff:staffView.statusConfirmed") :
             booking.status === "arrived" ? t("staff:staffView.statusArrived") :
             t("staff:staffView.statusInProgress")}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => sendBookingWhatsApp(booking)} className="h-8 w-8 p-0">
              <MessageCircle className="h-4 w-4" />
            </Button>
            {booking.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, "confirmed")} className="h-8 text-xs px-2.5">
                {t("staff:staffView.buttonAccept")}
              </Button>
            )}
            {booking.status === "confirmed" && (
              <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, "arrived")} className="h-8 text-xs px-2.5">
                {t("staff:staffView.buttonArrived")}
              </Button>
            )}
            {booking.status === "arrived" && (
              <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, "in_service")} className="h-8 text-xs px-2.5">
                {t("staff:staffView.buttonStart")}
              </Button>
            )}
            {booking.status === "in_service" && (
              <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking.id, "completed")} className="h-8 text-xs px-2.5">
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("staff:staffView.buttonComplete")}
              </Button>
            )}
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("staff:staffView.dialogCancelBooking")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("staff:staffView.dialogCancelBookingDesc", { name: booking.client_name, time: booking.start_time.slice(0, 5) })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("staff:staffView.dialogNo")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateBookingStatus(booking.id, "cancelled")} className="bg-destructive text-destructive-foreground">
                      {t("staff:staffView.dialogYesCancel")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-4">
        {loading ? (
          <Skeleton className="h-32 w-64 rounded-xl" />
        ) : accessDenied ? (
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-[var(--text-secondary)]">{t("staff:staffView.accessDenied")}</p>
            <Button variant="outline" onClick={signOut}>{t("staff:staffView.signOut")}</Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-[var(--text-secondary)]">{t("staff:staffView.noBusiness")}</p>
            <Button variant="outline" onClick={signOut}>{t("staff:staffView.signOut")}</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <img
            src={generatePixelAvatar(staffName || "Staff", 32)}
            alt=""
            className="h-8 w-8 rounded-full shrink-0 ring-2 ring-[var(--accent-light)]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[var(--text-primary)] truncate">{staffName}</h1>
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full shrink-0">
                On duty
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] truncate">{business.name} • {format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
          </div>
          <button
            onClick={signOut}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <button
            onClick={() => setTab("queue")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === "queue"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-tertiary)]"
            }`}
          >
            <Ticket className="h-4 w-4" />
            {t("staff:staffView.tabQueue")}
            {waiting.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-semibold px-1.5">
                {waiting.length > 99 ? "99+" : waiting.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === "bookings"
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-tertiary)]"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            {t("staff:staffView.tabBookings")}
            {bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-semibold px-1.5">
                {bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {tab === "queue" ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard
                label={t("staff:staffView.statWaiting")}
                count={waiting.length}
                icon={Users}
                color="bg-blue-50 text-blue-700 border border-blue-200"
                sectionRef={waitingRef}
              />
              <StatCard
                label={t("staff:staffView.sectionCalled")}
                count={called.length}
                icon={Phone}
                color="bg-amber-50 text-amber-700 border border-amber-200"
                sectionRef={calledRef}
              />
              <StatCard
                label={t("staff:staffView.statInService")}
                count={inService.length}
                icon={Play}
                color="bg-green-50 text-green-700 border border-green-200"
                sectionRef={inServiceRef}
              />
            </div>

            {/* Called section */}
            {called.length > 0 && (
              <div ref={calledRef} className="space-y-2 scroll-mt-20">
                <h3 className="text-sm font-bold text-amber-700 flex items-center gap-1.5 px-0.5">
                  <ArrowRight className="h-4 w-4" /> {t("staff:staffView.sectionCalled")} ({called.length})
                </h3>
                {called.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    actions={
                      <>
                        <Button size="sm" onClick={() => sendBackToQueue(ticket.id)} variant="ghost" className="h-9 text-xs">
                          {t("staff:staffView.buttonSendBack")}
                        </Button>
                        <Button size="sm" onClick={() => updateTicketStatus(ticket.id, "in_service")} className="h-9 gap-1">
                          <Play className="h-3.5 w-3.5" /> {t("staff:staffView.buttonStart")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 text-destructive border-destructive/30">
                              {t("staff:staffView.dialogNoShowButton")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("staff:staffView.dialogNoShow")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("staff:staffView.dialogNoShowDesc", { name: ticket.client_name })}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common:buttons.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => updateTicketStatus(ticket.id, "no_show")}>{t("common:buttons.confirm")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    }
                  />
                ))}
              </div>
            )}

            {/* In service section */}
            {inService.length > 0 && (
              <div ref={inServiceRef} className="space-y-2 scroll-mt-20">
                <h3 className="text-sm font-bold text-green-700 flex items-center gap-1.5 px-0.5">
                  <CheckCircle className="h-4 w-4" /> {t("staff:staffView.sectionInProgress")} ({inService.length})
                </h3>
                {inService.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    actions={
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(ticket.id, "completed")} className="h-9 gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> {t("staff:staffView.buttonComplete")}
                      </Button>
                    }
                  />
                ))}
              </div>
            )}

            {/* Waiting queue */}
            <div ref={waitingRef} className="space-y-2 scroll-mt-20">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 px-0.5">
                <Users className="h-4 w-4" /> {t("staff:staffView.sectionQueue")} ({waiting.length})
              </h3>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
              ) : waiting.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Users className="h-10 w-10 text-[var(--text-tertiary)] mx-auto" />
                  <p className="text-sm text-[var(--text-secondary)]">{t("staff:staffView.emptyNoClients")}</p>
                </div>
              ) : (
                waiting.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    actions={
                      <>
                        <Button size="sm" onClick={() => updateTicketStatus(ticket.id, "called")} className="h-9 gap-1">
                          <Phone className="h-3.5 w-3.5" /> {t("staff:staffView.buttonCall")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("staff:staffView.dialogCancelTicketTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("staff:staffView.dialogCancelTicketDesc", { label: ticket.ticket_label, name: ticket.client_name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("staff:staffView.dialogNo")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => updateTicketStatus(ticket.id, "cancelled")} className="bg-destructive text-destructive-foreground">
                                {t("staff:staffView.dialogYesCancel")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    }
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Bookings stats */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 p-3 min-h-[72px]">
                <Clock className="h-5 w-5 mb-0.5 opacity-70" />
                <span className="text-xl font-bold leading-tight">{bookings.filter((b) => b.status === "pending").length}</span>
                <span className="text-[10px] font-medium opacity-80">{t("staff:staffView.statPending")}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-700 p-3 min-h-[72px]">
                <UserCheck className="h-5 w-5 mb-0.5 opacity-70" />
                <span className="text-xl font-bold leading-tight">{bookings.filter((b) => b.status === "confirmed").length}</span>
                <span className="text-[10px] font-medium opacity-80">{t("staff:staffView.statConfirmed")}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-green-50 border border-green-200 text-green-700 p-3 min-h-[72px]">
                <Play className="h-5 w-5 mb-0.5 opacity-70" />
                <span className="text-xl font-bold leading-tight">{bookings.filter((b) => b.status === "arrived" || b.status === "in_service").length}</span>
                <span className="text-[10px] font-medium opacity-80">{t("staff:staffView.statInProgress")}</span>
              </div>
            </div>

            {/* Bookings list */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 px-0.5">
                <CalendarDays className="h-4 w-4" /> {t("staff:staffView.sectionTodayBookings")}
              </h3>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <CalendarDays className="h-10 w-10 text-[var(--text-tertiary)] mx-auto" />
                  <p className="text-sm text-[var(--text-secondary)]">{t("staff:staffView.emptyNoBookings")}</p>
                </div>
              ) : (
                bookings.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StaffView;

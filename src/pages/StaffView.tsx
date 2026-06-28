import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Play, CheckCircle, XCircle, Users, LogOut, Ticket, CalendarDays, MessageCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buildQueueCalledUrl, buildBookingConfirmationUrl } from "@/lib/whatsapp";
import type { Business, QueueTicket, Booking } from "@/types";
import type { BookingStatus } from "@/integrations/supabase/types";

type Tab = "queue" | "bookings";

/**
 * Staff view — live dashboard for staff members to manage queue tickets and day bookings.
 * Supports calling tickets, updating booking statuses, sending WhatsApp notifications.
 * @returns The staff view page JSX
 */
const StaffView = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [business, setBusiness] = useState<Pick<Business, "id" | "name" | "slug"> | null>(null);
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState<Tab>("queue");
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("staff_members")
      .select("id, business_id, businesses(id, name, slug)")
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
        }
        else {
          setAccessDenied(true);
          setLoading(false);
        }
      });
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!business || !staffMemberId) return;
    const { data, error } = await supabase
      .from("queue_tickets")
      .select("*, services(name)")
      .eq("business_id", business.id)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .or("staff_member_id.eq." + staffMemberId + ",staff_member_id.is.null")
      .order("ticket_number");

    if (error) { console.error("fetchTickets:", error); toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.loadQueueError"), variant: "destructive" }); }
    setTickets(data || []);
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

    if (error) { console.error("fetchBookings:", error); toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.loadBookingsError"), variant: "destructive" }); }
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

  const updateTicketStatus = async (id: string, status: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;
    const currentStatus = ticket.status;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = { status };
    if (status === "called") updates.called_at = new Date().toISOString();
    if (status === "completed" || status === "no_show") updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("queue_tickets")
      .update(updates)
      .eq("business_id", business!.id)
      .eq("id", id)
      .eq("status", currentStatus)
      .select("client_phone, ticket_label");

    if (error) {
      console.error("updateTicketStatus:", error);
      toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.updateTicketError"), variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: t("staff:staffView.toast.ticketTakenTitle"), description: t("staff:staffView.toast.ticketTakenDesc"), variant: "destructive" });
      fetchTickets();
      return;
    }
    if (status === "called") {
      const ticketData = data[0];
      const serviceName = ticket.services?.name || t("staff:staffView.serviceDefault");
      const url = buildQueueCalledUrl(ticketData.client_phone, business!.name, ticketData.ticket_label, serviceName);
      window.open(url, "_blank");
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
      console.error("updateBookingStatus:", error);
      toast({ title: t("common:toast.error"), description: t("staff:staffView.toast.updateBookingError"), variant: "destructive" });
      return;
    }
    fetchBookings();
  };

  const sendBookingWhatsApp = (booking: Booking) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceName = (booking.services as any)?.name || t("staff:staffView.serviceDefault");
    const url = buildBookingConfirmationUrl(
      booking.client_phone, business!.name, booking.date,
      booking.start_time.slice(0, 5), serviceName, null, booking.id
    );
    window.open(url, "_blank");
  };

  const waiting = tickets.filter((t) => t.status === "waiting");
  const called = tickets.filter((t) => t.status === "called");
  const inService = tickets.filter((t) => t.status === "in_service");

  const timeAgo = (dateStr: string) => {
    const mins = differenceInMinutes(new Date(), new Date(dateStr));
    return mins < 1 ? t("staff:staffView.timeJustNow") : t("staff:staffView.timeMin", { mins });
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
    <div className="min-h-screen bg-[var(--bg-base)]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">{business.name}</h1>
          <p className="text-xs text-[var(--text-secondary)] capitalize">{format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-default)] px-4">
        <button
          onClick={() => setTab("queue")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "queue"
              ? "border-primary text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Ticket className="h-4 w-4" />
          {t("staff:staffView.tabQueue")}
          {waiting.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{waiting.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setTab("bookings")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "bookings"
              ? "border-primary text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          {t("staff:staffView.tabBookings")}
          {bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length}
            </Badge>
          )}
        </button>
      </div>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {tab === "queue" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{waiting.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t("staff:staffView.statWaiting")}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{called.length + inService.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">{t("staff:staffView.statInService")}</p>
              </div>
            </div>

            {/* Called — waiting to be served */}
            {called.length > 0 && (
              <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] p-4 space-y-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("staff:staffView.sectionCalled")}</h3>
                {called.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--accent-muted)] p-3">
                    <span className="font-mono text-lg font-bold text-[var(--accent)]">{t.ticket_label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"} • {t.called_at ? timeAgo(t.called_at) : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => updateTicketStatus(t.id, "in_service")} className="gap-1">
                        <Play className="h-3 w-3" /> {t("staff:staffView.buttonStart")}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">No-show</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marquer comme no-show?</AlertDialogTitle>
                            <AlertDialogDescription>Le client {t.client_name} sera marqué comme absent.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateTicketStatus(t.id, "no_show")}>Confirmer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Currently in service */}
            {inService.length > 0 && (
              <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] p-4 space-y-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{t("staff:staffView.sectionInProgress")}</h3>
                {inService.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--accent-muted)] p-3">
                    <span className="font-mono text-lg font-bold text-[var(--accent)]">{t.ticket_label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"} • {t.called_at ? timeAgo(t.called_at) : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateTicketStatus(t.id, "completed")} className="gap-1">
                        <CheckCircle className="h-3 w-3" /> {t("staff:staffView.buttonComplete")}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">{t("staff:staffView.buttonNoShow")}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("staff:staffView.dialogNoShowTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("staff:staffView.dialogNoShowDesc", { clientName: t.client_name })}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("staff:staffView.dialogCancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateTicketStatus(t.id, "no_show")}>{t("staff:staffView.dialogConfirm")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Waiting queue */}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)]">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Ticket className="h-4 w-4" /> {t("staff:staffView.sectionQueue", { count: waiting.length })}
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : waiting.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-8 w-8 text-[var(--text-tertiary)] mx-auto" />
                    <p className="text-sm text-[var(--text-secondary)]">{t("staff:staffView.emptyNoClients")}</p>
                  </div>
                ) : (
                  waiting.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] p-3">
                      <span className="font-mono text-lg font-bold text-[var(--accent)] shrink-0">{t.ticket_label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"} • {t("staff:staffView.since")} {timeAgo(t.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateTicketStatus(t.id, "called")} className="gap-1">
                          <Play className="h-3 w-3" /> {t("staff:staffView.buttonCall")}
                        </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><XCircle className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("staff:staffView.dialogCancelTicketTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("staff:staffView.dialogCancelTicketDesc", { ticketLabel: t.ticket_label, clientName: t.client_name })}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("staff:staffView.dialogNo")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateTicketStatus(t.id, "cancelled")} className="bg-destructive text-destructive-foreground">{t("staff:staffView.dialogYesCancel")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bookings stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-center">
                <p className="text-xl font-bold text-[var(--text-primary)]">{bookings.filter((b) => b.status === "pending").length}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{t("staff:staffView.statPending")}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-center">
                <p className="text-xl font-bold text-[var(--text-primary)]">{bookings.filter((b) => b.status === "confirmed").length}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{t("staff:staffView.statConfirmed")}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-center">
                <p className="text-xl font-bold text-[var(--text-primary)]">{bookings.filter((b) => b.status === "arrived" || b.status === "in_service").length}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{t("staff:staffView.statInProgress")}</p>
              </div>
            </div>

            {/* Bookings list */}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)]">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> {t("staff:staffView.sectionTodayBookings")}
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <CalendarDays className="h-8 w-8 text-[var(--text-tertiary)] mx-auto" />
                    <p className="text-sm text-[var(--text-secondary)]">{t("staff:staffView.emptyNoBookings")}</p>
                  </div>
                ) : (
                  bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] p-3">
                      <div className="shrink-0 text-center min-w-[40px]">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{b.start_time.slice(0, 5)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{b.client_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {b.services?.name || "—"}
                          {b.staff_members?.display_name && ` • avec ${b.staff_members.display_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            b.status === "pending" ? "border-amber-300 text-amber-600" :
                            b.status === "confirmed" ? "border-blue-300 text-blue-600" :
                            b.status === "arrived" ? "border-green-300 text-green-600" :
                            "border-purple-300 text-purple-600"
                          }`}
                        >
                          {b.status === "pending" ? t("staff:staffView.statusPending") :
                           b.status === "confirmed" ? t("staff:staffView.statusConfirmed") :
                           b.status === "arrived" ? t("staff:staffView.statusArrived") : t("staff:staffView.statusInProgress")}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => sendBookingWhatsApp(b)} className="h-7 w-7 p-0">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {b.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "confirmed")} className="text-xs h-7 px-2">
                            {t("staff:staffView.buttonAccept")}
                          </Button>
                        )}
                        {b.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "arrived")} className="text-xs h-7 px-2">
                            {t("staff:staffView.buttonArrived")}
                          </Button>
                        )}
                        {b.status === "arrived" && (
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "in_service")} className="text-xs h-7 px-2">
                            {t("staff:staffView.buttonStart")}
                          </Button>
                        )}
                        {b.status === "in_service" && (
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "completed")} className="text-xs h-7 px-2">
                            {t("staff:staffView.buttonComplete")}
                          </Button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive h-7 px-2 text-xs">{t("staff:staffView.buttonCancel")}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("staff:staffView.dialogCancelBookingTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("staff:staffView.dialogCancelBookingDesc", { clientName: b.client_name, time: b.start_time.slice(0, 5) })}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("staff:staffView.dialogNo")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => updateBookingStatus(b.id, "cancelled")} className="bg-destructive text-destructive-foreground">{t("staff:staffView.dialogYesCancel")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StaffView;
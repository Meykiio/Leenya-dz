import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Play, CheckCircle, XCircle, Users, LogOut, Ticket } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Business, QueueTicket } from "@/types";

const StaffView = () => {
  const { user, signOut } = useAuth();
  const [business, setBusiness] = useState<Pick<Business, "id" | "name" | "slug"> | null>(null);
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  // Find staff member's business
  useEffect(() => {
    if (!user) return;
    supabase
      .from("staff_members")
      .select("business_id, businesses(id, name, slug)")
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
        if (data) setBusiness(data.businesses);
        else {
          setAccessDenied(true);
          setLoading(false);
        }
      });
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!business) return;
    const { data, error } = await supabase
      .from("queue_tickets")
      .select("*, services(name)")
      .eq("business_id", business.id)
      .eq("queue_date", today)
      .in("status", ["waiting", "called", "in_service"])
      .order("ticket_number");

    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    setTickets(data || []);
    setLoading(false);
  }, [business, today]);

  useEffect(() => {
    if (!business) return;
    fetchTickets();
    const channel = supabase
      .channel("staff-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets", filter: `business_id=eq.${business.id}` }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [business, fetchTickets]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "called") updates.called_at = new Date().toISOString();
    if (status === "completed" || status === "no_show") updates.completed_at = new Date().toISOString();

    let query = supabase.from("queue_tickets").update(updates).eq("id", id);
    if (status === "called") {
      query = query.eq("status", "waiting");
    }

    const { data, error } = await query.select("id");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    if (status === "called" && (!data || data.length === 0)) {
      toast({ title: "Ticket déjà pris", description: "Un autre membre a déjà appelé ce ticket.", variant: "destructive" });
      fetchTickets();
    }
  };

  const waiting = tickets.filter((t) => t.status === "waiting");
  const serving = tickets.filter((t) => t.status === "called" || t.status === "in_service");

  const timeAgo = (dateStr: string) => {
    const mins = differenceInMinutes(new Date(), new Date(dateStr));
    return mins < 1 ? "À l'instant" : `${mins} min`;
  };

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-4">
        {loading ? (
          <Skeleton className="h-32 w-64 rounded-xl" />
        ) : accessDenied ? (
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-[var(--text-secondary)]">Accès refusé — aucun commerce associé à votre compte.</p>
            <Button variant="outline" onClick={signOut}>Se déconnecter</Button>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 text-[var(--text-tertiary)] mx-auto" />
            <p className="text-[var(--text-secondary)]">Aucun commerce associé à votre compte.</p>
            <Button variant="outline" onClick={signOut}>Se déconnecter</Button>
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

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{waiting.length}</p>
            <p className="text-xs text-[var(--text-secondary)]">En attente</p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{serving.length}</p>
            <p className="text-xs text-[var(--text-secondary)]">En service</p>
          </div>
        </div>

        {/* Currently serving */}
        {serving.length > 0 && (
          <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] p-4 space-y-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">En service</h3>
            {serving.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--accent-muted)] p-3">
                <span className="font-mono text-lg font-bold text-[var(--accent)]">{t.ticket_label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"} • {t.called_at ? timeAgo(t.called_at) : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "completed")} className="gap-1">
                    <CheckCircle className="h-3 w-3" /> Terminer
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
                        <AlertDialogAction onClick={() => updateStatus(t.id, "no_show")}>Confirmer</AlertDialogAction>
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
              <Ticket className="h-4 w-4" /> File d'attente ({waiting.length})
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : waiting.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Users className="h-8 w-8 text-[var(--text-tertiary)] mx-auto" />
                <p className="text-sm text-[var(--text-secondary)]">Aucun client en attente</p>
              </div>
            ) : (
              waiting.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] p-3">
                  <span className="font-mono text-lg font-bold text-[var(--accent)] shrink-0">{t.ticket_label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.client_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{t.services?.name || "—"} • Depuis {timeAgo(t.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => updateStatus(t.id, "called")} className="gap-1">
                      <Play className="h-3 w-3" /> Appeler
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive"><XCircle className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Annuler ce ticket?</AlertDialogTitle>
                          <AlertDialogDescription>Le ticket {t.ticket_label} de {t.client_name} sera annulé.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Non</AlertDialogCancel>
                          <AlertDialogAction onClick={() => updateStatus(t.id, "cancelled")} className="bg-destructive text-destructive-foreground">Oui, annuler</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffView;

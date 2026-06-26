import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  arrived: { label: "Arrivé(e)", variant: "default" },
  in_service: { label: "En service", variant: "default" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "destructive" },
  no_show: { label: "Absent(e)", variant: "destructive" },
};

const BookingTrack = () => {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("bookings")
      .select("*, services(name), businesses(name, address, phone)")
      .eq("booking_token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setBooking(null);
        else setBooking(data);
        setLoading(false);
      });
  }, [token]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id)
      .eq("booking_token", token);

    if (error) {
      toast({ title: "Erreur", description: "Impossible d'annuler la réservation.", variant: "destructive" });
    } else {
      setBooking({ ...booking, status: "cancelled" });
      toast({ title: "Réservation annulée" });
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50 p-5">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <XCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-[14px] text-muted-foreground">Réservation introuvable.</p>
            <Button variant="outline" size="sm" asChild><Link to="/">Retour à l'accueil</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const status = statusLabels[booking.status] || statusLabels.pending;
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-[480px] mx-auto min-h-screen bg-background border-x border-border/50">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 h-[50px] flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[14px] font-semibold text-foreground">Ma réservation</h1>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + ref */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-mono text-muted-foreground">#{booking.id.slice(0, 8).toUpperCase()}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Details card */}
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-foreground">{booking.services?.name || "Service"}</p>
                <p className="text-[12px] text-muted-foreground">{booking.businesses?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[13px] text-foreground">
                {new Date(booking.date + "T00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[13px] font-mono text-foreground">{booking.start_time?.slice(0, 5)} — {booking.end_time?.slice(0, 5)}</p>
            </div>

            {booking.businesses?.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[13px] text-foreground">{booking.businesses.address}</p>
              </div>
            )}
          </div>

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full h-[44px] text-destructive border-destructive/20 hover:bg-destructive/5" disabled={cancelling}>
                  {cancelling ? "Annulation..." : "Annuler ma réservation"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Non</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                    Oui, annuler
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

export default BookingTrack;

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Calendar, MessageCircle, Share2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
}

interface Props {
  bookingId: string | null;
  bookingToken: string | null;
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  businessName: string;
  businessPhone: string | null;
  trackingUrl: string;
  googleCalUrl: string;
  shareToBusinessUrl: string;
  whatsappShareUrl: string;
  onCopyLink: () => void;
}

/** @description Booking confirmation step shown after successful submission — displays booking summary, tracking link, Google Calendar, and WhatsApp share actions. */
export default function StepConfirmed({
  bookingId, selectedService, selectedDate, selectedTime,
  businessName, trackingUrl, googleCalUrl, shareToBusinessUrl, whatsappShareUrl,
  onCopyLink,
}: Props) {
  return (
    <motion.div
      key="confirmed"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8 space-y-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
      >
        <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--success)' }} />
      </motion.div>
      <h2 className="text-[20px] font-bold text-foreground">Demande envoyée</h2>
      <p className="text-[13px] text-muted-foreground">
        En attente de confirmation par le salon.
      </p>

      <div className="rounded-md border border-border bg-muted/50 p-[14px_16px] text-left space-y-1">
        <p className="text-[14px] font-medium text-foreground">{selectedService?.name}</p>
        <p className="text-[12px] text-muted-foreground">
          {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} a {selectedTime}
        </p>
        <p className="text-[12px] text-muted-foreground">{businessName}</p>
      </div>

      {bookingId && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-[14px_16px] space-y-2">
          <p className="text-[13px] font-medium text-foreground">Lien de suivi</p>
          <p className="text-[12px] text-muted-foreground">Conservez ce lien pour suivre ou annuler votre reservation</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 text-xs" onClick={onCopyLink}>
              <Copy className="h-3.5 w-3.5" /> Copier
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 text-xs" asChild>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="flex-1 h-[44px]" asChild>
          <a href={googleCalUrl} target="_blank" rel="noopener noreferrer">
            <Calendar className="h-4 w-4 mr-1.5" /> Calendrier
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-[44px] gap-1" asChild>
          <a href={shareToBusinessUrl}>
            <MessageCircle className="h-4 w-4" /> Salon
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-[44px] gap-1" asChild>
          <a href={whatsappShareUrl}>
            <Share2 className="h-4 w-4" /> WhatsApp
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

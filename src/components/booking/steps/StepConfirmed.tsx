import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ExternalLink, Calendar, MessageCircle, Share2, Bell, BellOff, Smartphone } from "lucide-react";
import { useWebPush } from "@/hooks/useWebPush";

const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !("PushManager" in window);

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
  businessId: string;
  businessPhone: string | null;
  trackingUrl: string;
  googleCalUrl: string;
  shareToBusinessUrl: string;
  whatsappShareUrl: string;
  onCopyLink: () => void;
}

export default function StepConfirmed({
  bookingId, bookingToken, selectedService, selectedDate, selectedTime,
  businessName, businessId, trackingUrl, googleCalUrl, shareToBusinessUrl, whatsappShareUrl,
  onCopyLink,
}: Props) {
  const { t, i18n } = useTranslation();
  const { isSupported, permission, subscribing, subscribe } = useWebPush();

  const handleEnablePush = async () => {
    if (!bookingId) return;
    await subscribe({ businessId, bookingId, locale: i18n.language });
  };

  const showPushPrompt = isSupported && permission !== "granted" && permission !== "unsupported" && bookingId;
  const showIOSPrompt = isIOS && permission !== "granted";

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
      <h2 className="text-[20px] font-bold text-foreground">{t("booking:appointmentFlow.stepConfirmed.title")}</h2>
      <p className="text-[13px] text-muted-foreground">
        {t("booking:appointmentFlow.stepConfirmed.pending")}
      </p>

      <div className="rounded-md border border-border bg-muted/50 p-[14px_16px] text-left space-y-1">
        <p className="text-[14px] font-medium text-foreground">{selectedService?.name}</p>
        <p className="text-[12px] text-muted-foreground">
          {selectedDate && t("booking:appointmentFlow.dateTimeLine", {
            date: selectedDate.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" }),
            time: selectedTime,
          })}
        </p>
        <p className="text-[12px] text-muted-foreground">{businessName}</p>
      </div>

      {showIOSPrompt && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-[14px_16px] space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-medium text-foreground">{t("common:push.iosTitle")}</p>
          </div>
          <p className="text-[12px] text-muted-foreground text-left">
            {t("common:push.iosMessage")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            asChild
          >
            <a href="https://support.apple.com/guide/iphone/bookmark-frequently-visited-webpages-iph42efe91e7/ios#iph28c2ec388" target="_blank" rel="noopener noreferrer">
              <Smartphone className="h-3.5 w-3.5" /> {t("common:push.iosButton")}
            </a>
          </Button>
        </div>
      )}

      {!isIOS && showPushPrompt && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-[14px_16px] space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-medium text-foreground">{t("common:push.enableTitle")}</p>
          </div>
          <p className="text-[12px] text-muted-foreground text-left">
            {t("common:push.enableMessage")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleEnablePush}
            disabled={subscribing}
          >
            {subscribing ? t("common:loading") : <><Bell className="h-3.5 w-3.5" /> {t("common:push.enableButton")}</>}
          </Button>
        </div>
      )}

      {permission === "denied" && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-[14px_16px] space-y-1">
          <div className="flex items-center gap-2">
            <BellOff className="h-4 w-4 text-destructive" />
            <p className="text-[13px] font-medium text-foreground">{t("common:push.permissionDenied")}</p>
          </div>
          <p className="text-[12px] text-muted-foreground">{t("common:push.permissionDeniedDesc")}</p>
        </div>
      )}

      {bookingId && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-[14px_16px] space-y-2">
          <p className="text-[13px] font-medium text-foreground">{t("booking:appointmentFlow.stepConfirmed.trackingLink")}</p>
          <p className="text-[12px] text-muted-foreground">{t("booking:appointmentFlow.stepConfirmed.trackingHint")}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 text-xs" onClick={onCopyLink}>
              <Copy className="h-3.5 w-3.5" /> {t("booking:appointmentFlow.stepConfirmed.copy")}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1 h-8 text-xs" asChild>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {t("booking:appointmentFlow.stepConfirmed.open")}
              </a>
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="flex-1 h-[44px]" asChild>
          <a href={googleCalUrl} target="_blank" rel="noopener noreferrer">
            <Calendar className="h-4 w-4 mr-1.5" /> {t("booking:appointmentFlow.stepConfirmed.calendar")}
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-[44px] gap-1" asChild>
          <a href={shareToBusinessUrl}>
            <MessageCircle className="h-4 w-4" /> {t("booking:appointmentFlow.stepConfirmed.contactBusiness")}
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-[44px] gap-1" asChild>
          <a href={whatsappShareUrl}>
            <Share2 className="h-4 w-4" /> {t("booking:appointmentFlow.stepConfirmed.whatsapp")}
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

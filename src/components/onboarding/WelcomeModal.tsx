import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, Copy, MessageCircle } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";

interface WelcomeModalProps {
  slug: string;
  onClose: () => void;
}

const WelcomeModal = ({ slug, onClose }: WelcomeModalProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(t("auth:onboarding.welcome.whatsappShareText", { link }));
    openWhatsApp(`https://wa.me/?text=${text}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("auth:onboarding.welcome.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("auth:onboarding.welcome.subtitle")}
        </p>
        <div className="rounded-md bg-muted px-4 py-3 font-mono text-primary text-lg">
          {link}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleCopy} variant="outline" className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("auth:onboarding.welcome.copied") : t("auth:onboarding.welcome.copyLink")}
          </Button>
          <Button onClick={handleWhatsApp} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {t("auth:onboarding.shareWhatsApp")}
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
          {t("auth:onboarding.goToDashboard")} →
        </Button>
      </div>
    </div>
  );
};

export default WelcomeModal;

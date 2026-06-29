import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "213770000000";

/** @description Fixed-position floating WhatsApp help button displayed at the bottom-right corner linking to support. */
export default function FloatingHelp() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const helpText = isArabic
    ? "مرحباً، أحتاج مساعدة مع لينيا."
    : "Bonjour, j'ai besoin d'aide avec Leenya.";

  return (
    <a
      href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(helpText)}`}
      className="fixed bottom-20 lg:bottom-6 right-4 z-30 flex items-center gap-2 rounded-full bg-success px-4 py-3 text-success-foreground shadow-lg hover:opacity-90 transition-opacity rtl:left-4 rtl:right-auto"
      title={t("landing:floatingHelp.label")}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-medium hidden sm:inline">{t("landing:floatingHelp.label")}</span>
    </a>
  );
}

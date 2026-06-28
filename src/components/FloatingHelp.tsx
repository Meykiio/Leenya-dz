import { MessageCircle } from "lucide-react";

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "213770000000";

export default function FloatingHelp() {

  return (
    <a
      href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide avec Leenya. 👋")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 lg:bottom-6 right-4 z-30 flex items-center gap-2 rounded-full bg-success px-4 py-3 text-success-foreground shadow-lg hover:opacity-90 transition-opacity rtl:left-4 rtl:right-auto"
      title="Besoin d'aide?"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-medium hidden sm:inline">Besoin d'aide?</span>
    </a>
  );
}

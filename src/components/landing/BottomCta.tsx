import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

export default function BottomCta() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-slow [transition-timing-function:cubic-bezier(.22,1,.36,1)] rtl:translate-x-1/2 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 bg-card border border-[var(--border-default)] rounded-full px-4 py-2 shadow-lg">
        <span className="font-display text-foreground text-sm font-extrabold tracking-[-0.02em]">
          Leenya<span className="text-[var(--signal)]">.</span>
        </span>
        <span className="text-[var(--text-secondary)] text-sm">·</span>
        <Link
          to={session ? "/dashboard" : "/login"}
          className="bg-primary hover:opacity-90 rounded-full px-4 py-1.5 text-primary-foreground text-[13px] font-semibold transition-all duration-150 flex items-center gap-1"
        >
          <span className="sm:hidden">
            <ArrowRight className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">
            {session ? t("landing:bottomCta.dashboard") : t("landing:bottomCta.createAccount")}
          </span>
        </Link>
      </div>
    </div>
  );
}
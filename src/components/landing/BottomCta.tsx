import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 rtl:translate-x-1/2 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 bg-[#1C1C1A] border border-white/[0.1] rounded-full px-4 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
        <span className="text-white text-sm font-semibold tracking-tight">Leenya</span>
        <span className="text-white/20 text-sm">·</span>
        <Link
          to={session ? "/dashboard" : "/login"}
          className="bg-[#7b39fc] hover:bg-[#6828e8] rounded-full px-4 py-1.5 text-white text-[13px] font-semibold transition-all duration-200"
        >
          {session ? t("landing:bottomCta.dashboard") : t("landing:bottomCta.createAccount")}
        </Link>
      </div>
    </div>
  );
}

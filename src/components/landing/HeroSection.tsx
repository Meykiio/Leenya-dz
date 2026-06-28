import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

const navLinks = [
  { labelKey: "nav.home", href: "#" },
  { labelKey: "nav.services", href: "#features", hasDropdown: true },
  { labelKey: "nav.approach", href: "#testimonials" },
  { labelKey: "nav.contact", href: "#testimonials" },
];

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

const HeroSection = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Video Background with fallback gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2b2344] to-[#1a1630]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d8jnt0lcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-[120px] py-[16px]">
        {/* Logo */}
        <span className="text-white text-lg font-semibold tracking-tight">
          Leenya
        </span>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.labelKey}
              href={link.href}
              className="flex items-center gap-1 text-white/80 hover:text-white text-[14px] font-medium transition-all duration-200"
            >
              {t("landing:" + link.labelKey)}
              {link.hasDropdown && <ChevronDown className="h-3.5 w-3.5" />}
            </a>
          ))}
        </div>

        {/* Desktop Language Switcher */}
        <div className="hidden md:block relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-[13px] font-medium transition-all duration-200 px-2 py-1"
          >
            <Globe className="h-3.5 w-3.5" />
            {language.toUpperCase()}
            <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-1 w-20 bg-white rounded-lg shadow-lg overflow-hidden z-50 rtl:right-auto rtl:left-0">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    language === opt.code
                      ? "bg-[#7b39fc] text-white"
                      : "text-[#171717] hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <Link
              to="/dashboard"
              className="bg-[#7b39fc] rounded-[8px] px-5 py-2 text-white text-[14px] font-semibold transition-all duration-200 hover:bg-[#6828e8] shadow-sm"
            >
              {t("landing:nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-white rounded-[8px] px-5 py-2 text-[#171717] text-[14px] font-semibold border border-[#d4d4d4] transition-all duration-200 hover:bg-gray-50"
              >
                {t("landing:nav.login")}
              </Link>
              <Link
                to="/login"
                className="bg-[#7b39fc] rounded-[8px] px-5 py-2 text-[#fafafa] text-[14px] font-semibold transition-all duration-200 hover:bg-[#6828e8] shadow-sm"
              >
                {t("landing:nav.signup")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("landing:nav.menu")}
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      {/* Mobile Full-Screen Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black flex flex-col items-center justify-center gap-8">
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white rtl:right-auto rtl:left-4"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t("landing:nav.close")}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex flex-col items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.labelKey}
                href={link.href}
                className="text-white text-lg font-medium hover:opacity-80 transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("landing:" + link.labelKey)}
              </a>
            ))}
            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-2 mt-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { setLanguage(opt.code); setMobileMenuOpen(false); }}
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                    language === opt.code
                      ? "bg-[#7b39fc] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4 w-full max-w-[240px]">
            {session ? (
              <Link
                to="/dashboard"
                className="bg-[#7b39fc] rounded-[8px] px-8 py-3 text-white text-[16px] font-semibold text-center block"
                onClick={() => setMobileMenuOpen(false)}
              >
              {t("landing:nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-white rounded-[8px] px-8 py-3 text-[#171717] text-[16px] font-semibold text-center block border border-[#d4d4d4]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing:nav.login")}
                </Link>
                <Link
                  to="/login"
                  className="bg-[#7b39fc] rounded-[8px] px-8 py-3 text-white text-[16px] font-semibold text-center block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing:nav.signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Content — flex-1 centers vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        {/* Headline */}
        <h1 className="font-serif text-5xl md:text-[96px] text-white leading-[1.1] tracking-tight max-w-[900px] mb-6 text-center">
          {t("landing:hero.title")}
        </h1>

        {/* Subtext */}
        <p className="text-[17px] md:text-[18px] text-white/70 leading-relaxed max-w-[662px] mb-10 text-center">
          {t("landing:hero.subtitle")}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/login"
            className="bg-[#7b39fc] hover:bg-[#6828e8] rounded-[10px] px-7 py-3.5 text-white font-medium text-[16px] transition-all duration-200 shadow-lg shadow-[#7b39fc]/25"
          >
            {t("landing:hero.cta")}
          </Link>
          <a
            href="#how-it-works"
            className="bg-[#2b2344] hover:bg-[#3a2d55] rounded-[10px] px-7 py-3.5 text-[#f6f7f9] font-medium text-[16px] transition-all duration-200"
          >
            {t("landing:hero.ctaSecondary")}
          </a>
        </div>

        {/* Footnote */}
        <p className="text-xs text-white/50 mt-6">
          {t("landing:hero.footnote")}
        </p>
      </div>
    </section>
  );
};

export default HeroSection;

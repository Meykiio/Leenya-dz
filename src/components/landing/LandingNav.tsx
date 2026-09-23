import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll } from "framer-motion";
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

/** @description Sticky landing navigation — solidifies smoothly once the page scrolls, with language switcher and auth actions. */
export default function LandingNav() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-med [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
        scrolled
          ? "bg-[var(--nav-bg)]/90 backdrop-blur-md border-b border-[var(--border-default)] shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className={`flex items-center justify-between px-6 lg:px-[120px] transition-all duration-med ${scrolled ? "py-2.5" : "py-4"}`}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-primary font-mono text-[15px] font-medium text-primary-foreground tracking-[-0.04em]">
            Ln
          </span>
          <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-foreground">
            Leenya<span className="text-[var(--signal)]">.</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.labelKey}
              href={link.href}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-foreground text-[14px] font-medium transition-all duration-150"
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
            className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-foreground text-[13px] font-medium transition-all duration-150 px-2 py-1"
          >
            <Globe className="h-3.5 w-3.5" />
            {language.toUpperCase()}
            <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-1 w-20 rounded-[5px] border border-[var(--outline)] bg-card shadow-md overflow-hidden z-50 rtl:right-auto rtl:left-0">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { setLanguage(opt.code); setLangOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    language === opt.code
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-[var(--bg-muted)]"
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
              className="rounded-[5px] bg-primary px-[18px] py-2 text-primary-foreground text-[14px] font-semibold transition-all duration-150 hover:opacity-90 hover:-translate-y-px hover:shadow-sm"
            >
              {t("landing:nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-[5px] border border-[var(--outline-hi)] bg-transparent px-[18px] py-2 text-foreground text-[14px] font-semibold transition-all duration-150 hover:bg-[var(--bg-overlay)] hover:-translate-y-px"
              >
                {t("landing:nav.login")}
              </Link>
              <Link
                to="/login?mode=signup"
                className="rounded-[5px] bg-primary px-[18px] py-2 text-primary-foreground text-[14px] font-semibold transition-all duration-150 hover:opacity-90 hover:-translate-y-px hover:shadow-sm"
              >
                {t("landing:nav.signup")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("landing:nav.menu")}
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      {/* Scroll progress — the signal line tracking the page, from the design system */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress }}
        className={`absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-[var(--signal)] transition-opacity duration-fast ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Mobile Full-Screen Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-dim)] flex flex-col items-center justify-center gap-8">
          <button
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-foreground rtl:right-auto rtl:left-4"
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
                className="text-foreground text-lg font-medium hover:opacity-80 transition-all"
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
                  className={`text-sm font-medium px-3 py-1 rounded-[5px] transition-colors ${
                    language === opt.code
                      ? "bg-primary text-primary-foreground"
                      : "text-[var(--text-secondary)] hover:text-foreground"
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
                className="rounded-[5px] bg-primary px-8 py-3 text-primary-foreground text-[16px] font-semibold text-center block"
                onClick={() => setMobileMenuOpen(false)}
              >
              {t("landing:nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-[5px] border border-[var(--outline-hi)] px-8 py-3 text-foreground text-[16px] font-semibold text-center block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing:nav.login")}
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="rounded-[5px] bg-primary px-8 py-3 text-primary-foreground text-[16px] font-semibold text-center block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("landing:nav.signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
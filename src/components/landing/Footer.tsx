import { Link } from "react-router-dom";
import { MessageCircle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="py-14 px-6 bg-[var(--bg-dim)] border-t border-[var(--outline)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-10 pb-10 border-b border-[var(--border-default)]">
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-primary font-mono text-[15px] font-medium text-primary-foreground tracking-[-0.04em]">
                Ln
              </span>
              <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
                Leenya<span className="text-[var(--signal)]">.</span>
              </span>
            </Link>
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {t("landing:footer.description")}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://wa.me/213542883297"
                className="h-8 w-8 rounded-[8px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:border-primary transition-all"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
              <a
                href="mailto:sifeddine.meb96@gmail.com"
                className="h-8 w-8 rounded-[8px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-primary hover:border-primary transition-all"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-4">
                {t("landing:footer.navigation")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <a href="#features" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.features")}
                </a>
                <a href="#pricing" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.pricing")}
                </a>
                <a href="#testimonials" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.approach")}
                </a>
                <a href="#faq" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.faq")}
                </a>
              </nav>
            </div>
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-4">
                {t("landing:footer.legal")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <Link to="/terms" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.tos")}
                </Link>
                <Link to="/privacy" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.privacy")}
                </Link>
              </nav>
            </div>
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-4">
                {t("landing:footer.contact")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <a href="mailto:sifeddine.meb96@gmail.com" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  sifeddine.meb96@gmail.com
                </a>
                <a href="https://wa.me/213542883297" className="text-xs text-[var(--text-secondary)] hover:text-foreground transition-all duration-150">
                  {t("landing:footer.whatsapp")}
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <span>{t("landing:footer.copyright")}</span>
          <span className="text-[var(--text-secondary)] opacity-60">
            {t("landing:footer.builtIn")}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
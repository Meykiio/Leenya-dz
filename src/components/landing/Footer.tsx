import { Link } from "react-router-dom";
import { MessageCircle, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="py-14 px-6 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-10 pb-10 border-b border-border">
          <div className="max-w-xs">
            <span className="text-[17px] font-semibold tracking-tight text-foreground">
              Leenya
            </span>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t("landing:footer.description")}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://wa.me/213542883297"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/30 transition-all"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
              <a
                href="mailto:sifeddine.meb96@gmail.com"
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent/30 transition-all"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {t("landing:footer.navigation")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.features")}
                </a>
                <a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.pricing")}
                </a>
                <a href="#testimonials" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.approach")}
                </a>
                <a href="#faq" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.faq")}
                </a>
              </nav>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {t("landing:footer.legal")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.tos")}
                </Link>
                <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.privacy")}
                </Link>
              </nav>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {t("landing:footer.contact")}
              </p>
              <nav className="flex flex-col gap-2.5">
                <a href="mailto:sifeddine.meb96@gmail.com" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  sifeddine.meb96@gmail.com
                </a>
                <a href="https://wa.me/213542883297" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200">
                  {t("landing:footer.whatsapp")}
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("landing:footer.copyright")}</span>
          <span className="text-muted-foreground/50">
            {t("landing:footer.builtIn")}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

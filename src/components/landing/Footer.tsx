import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-9 px-6 bg-background border-t border-border">
      <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Wordmark + Copyright */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Leenya</span>
          <span>·</span>
          <span>© 2025 Leenya. Conçu en Algérie 🇩🇿</span>
        </div>

        {/* Right: Nav Links */}
        <nav className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Tarifs
          </a>
          <a href="#contact" className="hover:text-foreground transition-colors">
            Contact
          </a>
          <Link to="/" className="hover:text-foreground transition-colors">
            CGU
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors">
            Confidentialité
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;

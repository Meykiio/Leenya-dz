import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <>
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 backdrop-blur-xl border-b border-border/80">
        <div className="max-w-[1080px] mx-auto h-full px-6 flex items-center justify-between">
          {/* Left: Wordmark */}
          <span className="text-[17px] font-semibold tracking-tight text-foreground">
            Leenya
          </span>

          {/* Center: Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
            <a href="#contact" className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Right: Auth buttons */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm" className="h-8">
              <Link to="/login">Commencer gratuitement</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative pt-32 pb-20 px-6"
        style={{ 
          backgroundColor: 'var(--text-primary)',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      >
        <div className="max-w-[640px] mx-auto text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mb-7 rounded-full border border-white/10 bg-white/5">
            <span className="text-xs font-medium text-white/55">
              🇩🇿 Conçu pour les entreprises algériennes
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[34px] md:text-[54px] font-bold text-white leading-[1.08] tracking-tight mb-5">
            Gérez votre{" "}
            <span className="underline decoration-primary decoration-2 underline-offset-4">
              file
            </span>
            .<br />
            Gagnez du temps.
          </h1>

          {/* Subtext */}
          <p className="text-[17px] text-white/50 max-w-[500px] mx-auto mb-9 leading-relaxed">
            Leenya gère vos réservations, votre file d'attente et vos rappels.
            Vos clients réservent en ligne. Vous gérez tout depuis un tableau de bord.
          </p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Button asChild size="lg" className="h-10 px-[18px] bg-white text-[#0C0C0A] hover:bg-white/90 border-0">
              <Link to="/login">Créer mon compte gratuit</Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="h-10 px-[18px] bg-transparent text-white/45 border-white/12 hover:text-white/75 hover:border-white/25 hover:bg-transparent"
            >
              <a href="#how-it-works">Voir la démo →</a>
            </Button>
          </div>

          {/* Trust Line */}
          <p className="mt-[18px] text-xs text-white/28 tracking-wide">
            Gratuit pour commencer · Prêt en 5 minutes · Sans carte bancaire
          </p>

          {/* Dashboard Preview Mockup */}
          <div className="mt-14 max-w-[900px] mx-auto">
            <div 
              className="rounded-[14px] p-px"
              style={{
                background: 'linear-gradient(160deg, #1A1A18 0%, #111110 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 80px rgba(26,86,219,0.12), 0 20px 60px rgba(0,0,0,0.4)'
              }}
            >
              <div className="h-[200px] md:h-[360px] bg-[#141413] rounded-[13px] overflow-hidden flex">
                {/* Sidebar Strip */}
                <div className="w-10 md:w-[52px] bg-[#1A1A18] border-r border-white/5 flex-shrink-0" />
                
                {/* Main Content Area */}
                <div className="flex-1 p-3 md:p-5">
                  {/* Top Cards Row */}
                  <div className="flex gap-2 md:gap-3 mb-3 md:mb-4">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className="flex-1 h-16 md:h-24 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                      />
                    ))}
                  </div>
                  {/* Table Representation */}
                  <div className="h-20 md:h-40 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;

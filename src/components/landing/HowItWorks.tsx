const steps = [
  {
    number: "1",
    title: "Créez votre profil",
    desc: "Configurez vos services, horaires et équipe en quelques minutes. Obtenez votre lien public personnalisé.",
  },
  {
    number: "2",
    title: "Partagez le lien",
    desc: "Envoyez leenya.dz/votre-salon sur WhatsApp, Instagram ou affichez-le en façade. Vos clients réservent seuls.",
  },
  {
    number: "3",
    title: "Gérez en direct",
    desc: "Réservations, file d'attente, rappels automatiques — tout dans un seul tableau de bord, depuis votre téléphone.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-background">
      <div className="max-w-[1080px] mx-auto">
        {/* Section Label */}
        <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-3.5">
          Comment ça marche
        </p>
        
        {/* Heading */}
        <h2 className="text-[34px] font-bold text-foreground tracking-tight mb-14">
          Votre salon en ligne en 5 minutes.
        </h2>

        {/* Steps Container */}
        <div className="relative">
          {/* Dashed connector line (desktop only) */}
          <div className="hidden md:block absolute top-4 left-[calc(16.67%-16px)] right-[calc(16.67%-16px)] border-t border-dashed border-border" />
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-3.5">
                {/* Step Number */}
                <div className="w-8 h-8 rounded-md bg-muted border border-border flex items-center justify-center font-mono text-[13px] font-semibold text-primary relative z-10 bg-background">
                  {step.number}
                </div>
                
                {/* Step Title */}
                <h3 className="text-base font-semibold text-foreground">
                  {step.title}
                </h3>
                
                {/* Step Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

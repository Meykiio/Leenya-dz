const features = [
  {
    eyebrow: "RÉSERVATIONS",
    title: "En ligne, à toute heure",
    desc: "Vos clients réservent depuis leur téléphone même à minuit. Plus de WhatsApp manqués. Plus de carnets perdus.",
    mockupType: "bookings",
  },
  {
    eyebrow: "FILE D'ATTENTE",
    title: "Attendre chez soi, pas chez vous",
    desc: "Vos clients prennent un ticket depuis leur téléphone et reçoivent une alerte quand c'est leur tour.",
    mockupType: "queue",
  },
  {
    eyebrow: "TABLEAU DE BORD",
    title: "Tout au même endroit",
    desc: "Réservations, file d'attente, équipe et statistiques. Pensé pour être utilisé entre deux clients.",
    mockupType: "dashboard",
  },
];

const FeatureMockup = ({ type }: { type: string }) => {
  if (type === "bookings") {
    return (
      <div className="space-y-3">
        {/* Calendar header */}
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-md bg-background border border-border" />
          <div className="h-8 w-16 rounded-md bg-primary/10 border border-primary/20" />
        </div>
        {/* Time slots */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-10 w-14 rounded bg-background border border-border flex items-center justify-center">
                <div className="h-2 w-8 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="h-10 flex-1 rounded bg-background border border-border" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "queue") {
    return (
      <div className="space-y-3">
        {/* Current serving */}
        <div className="h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <div className="text-center">
            <div className="h-2 w-20 rounded-full bg-primary/30 mx-auto mb-1.5" />
            <div className="font-mono text-2xl font-bold text-primary">A-12</div>
          </div>
        </div>
        {/* Waiting list */}
        <div className="space-y-2">
          {["A-13", "A-14", "A-15"].map((ticket) => (
            <div key={ticket} className="h-10 rounded bg-background border border-border flex items-center justify-between px-3">
              <div className="font-mono text-sm text-muted-foreground">{ticket}</div>
              <div className="h-2 w-16 rounded-full bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dashboard mockup
  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-14 rounded-lg bg-background border border-border p-2">
            <div className="h-2 w-10 rounded-full bg-muted-foreground/20 mb-2" />
            <div className="h-3 w-8 rounded-full bg-foreground/20" />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="h-24 rounded-lg bg-background border border-border flex items-end p-3 gap-1.5">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/20"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="bg-background">
      {features.map((feature, index) => {
        const isReversed = index % 2 === 1;
        const bgClass = index % 2 === 1 ? "bg-secondary" : "bg-background";

        return (
          <div key={feature.eyebrow} className={`py-20 px-6 ${bgClass}`}>
            <div className="max-w-[1080px] mx-auto">
              <div className={`grid md:grid-cols-2 gap-12 items-center ${isReversed ? "md:flex-row-reverse" : ""}`}>
                {/* Text Column */}
                <div className={isReversed ? "md:order-2" : ""}>
                  <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-3">
                    {feature.eyebrow}
                  </p>
                  <h3 className="text-[26px] font-bold text-foreground tracking-tight mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-[1.7]">
                    {feature.desc}
                  </p>
                </div>

                {/* Mockup Column */}
                <div className={isReversed ? "md:order-1" : ""}>
                  <div className="h-[240px] rounded-xl bg-muted border border-border p-6 flex items-center justify-center">
                    <div className="w-full max-w-[280px]">
                      <FeatureMockup type={feature.mockupType} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default FeaturesSection;

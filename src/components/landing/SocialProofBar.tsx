const stats = [
  { value: "500+", label: "Entreprises" },
  { value: "12 000+", label: "Réservations" },
  { value: "4.8 ★", label: "Note moyenne" },
];

const SocialProofBar = () => {
  return (
    <section className="py-5 px-6 bg-background border-y border-border">
      <div className="max-w-[1080px] mx-auto text-center">
        <p className="text-xs text-muted-foreground mb-2.5">
          Déjà utilisé par des salons, cliniques et barbershops en Algérie
        </p>
        <div className="inline-flex items-center gap-8">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-8">
              <div className="text-center">
                <p className="font-semibold text-lg text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              {index < stats.length - 1 && (
                <div className="h-7 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofBar;

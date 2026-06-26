const testimonials = [
  {
    quote:
      "Avant Leenya, je gérais tout sur un carnet. Maintenant mes clientes réservent toutes seules à minuit.",
    name: "Nadia B.",
    role: "Salon de beauté, Alger",
    initials: "NB",
  },
  {
    quote: "Les rappels automatiques ont réduit mes annulations de moitié.",
    name: "Dr. Karim M.",
    role: "Dentiste, Oran",
    initials: "KM",
  },
  {
    quote:
      "Mes clients adorent suivre leur position dans la file depuis leur téléphone.",
    name: "Sofiane A.",
    role: "Barbershop, Constantine",
    initials: "SA",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="contact" className="py-20 px-6 bg-secondary">
      <div className="max-w-[1080px] mx-auto">
        {/* Section Label */}
        <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-muted-foreground mb-3.5 text-center">
          Témoignages
        </p>
        
        {/* Heading */}
        <h2 className="text-[34px] font-bold text-foreground tracking-tight text-center mb-14">
          Ils utilisent Leenya au quotidien
        </h2>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative bg-background rounded-xl p-6 border border-border"
            >
              {/* Large Quote Mark */}
              <span className="absolute top-4 left-5 font-mono text-[64px] leading-none text-muted/50 select-none">
                "
              </span>

              {/* Quote Text */}
              <p className="relative z-10 text-sm text-muted-foreground leading-[1.7] pt-10 pb-4">
                {t.quote}
              </p>

              {/* Author Row */}
              <div className="flex items-center gap-3 mt-auto">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.initials}
                  </span>
                </div>
                
                {/* Name & Role */}
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

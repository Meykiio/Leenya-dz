import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CtaBanner = () => {
  return (
    <section className="py-20 px-6 text-center" style={{ backgroundColor: 'var(--text-primary)' }}>
      <div className="max-w-[640px] mx-auto">
        <h2 className="text-[32px] font-bold text-white tracking-tight">
          Prêt à moderniser votre entreprise?
        </h2>
        <p className="mt-3 text-[15px] text-white/45 mb-8">
          Rejoignez des centaines d'entreprises qui utilisent Leenya.
        </p>
        <Button asChild size="lg" className="h-10 px-[18px] bg-white text-[#0C0C0A] hover:bg-white/90 border-0">
          <Link to="/login">Créer mon compte gratuit →</Link>
        </Button>
      </div>
    </section>
  );
};

export default CtaBanner;

import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaBanner from "@/components/landing/CtaBanner";
import BottomCta from "@/components/landing/BottomCta";
import Footer from "@/components/landing/Footer";
import BackToTop from "@/components/landing/BackToTop";

const Landing = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaBanner />
      <Footer />
      <BottomCta />
      <BackToTop />
    </div>
  );
};

export default Landing;

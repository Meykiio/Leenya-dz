import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import FeaturesSection from "@/components/landing/FeaturesSection";
import MarqueeSection from "@/components/landing/MarqueeSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaBanner from "@/components/landing/CtaBanner";
import BottomCta from "@/components/landing/BottomCta";
import Footer from "@/components/landing/Footer";
import FeedbackSection from "@/components/landing/FeedbackSection";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

/**
 * Landing page — the public marketing homepage.
 * Composes sticky nav, hero, how-it-works, features, testimonials, pricing, FAQ, CTAs and footer.
 * @returns The landing page JSX
 */
const Landing = () => {
  useSmoothScroll();

  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <HowItWorks />
      <FeaturesSection />
      <MarqueeSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaBanner />
      <FeedbackSection />
      <Footer />
      <BottomCta />
    </div>
  );
};

export default Landing;

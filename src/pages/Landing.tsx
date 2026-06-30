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
import FeedbackSection from "@/components/landing/FeedbackSection";

/**
 * Landing page — the public marketing homepage.
 * Composes hero, how-it-works, features, testimonials, pricing, FAQ, CTAs and footer.
 * @returns The landing page JSX
 */
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
      <FeedbackSection />
      <Footer />
      <BottomCta />
      <BackToTop />
    </div>
  );
};

export default Landing;

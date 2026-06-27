import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

const Onboarding = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <OnboardingWizard />;
};

export default Onboarding;

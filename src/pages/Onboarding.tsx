import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

/**
 * Onboarding page — guards the onboarding wizard behind authentication.
 * Redirects unauthenticated users to /login.
 * @returns The onboarding wizard JSX, or a redirect
 */
const Onboarding = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <OnboardingWizard />;
};

export default Onboarding;

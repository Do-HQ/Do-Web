import OnboardingRouteGate from "@/components/onboarding/onboarding-route-gate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Create your profile and workspace",
};

const OnboardingPage = () => <OnboardingRouteGate />;

export default OnboardingPage;

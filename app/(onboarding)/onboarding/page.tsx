import ProfileSetup from "@/components/auth/ProfileSetup";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Create your profile and workspace",
};

const OnboardingPage = () => {
  return <ProfileSetup />;
};

export default OnboardingPage;

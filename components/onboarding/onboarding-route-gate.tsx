"use client";

import ProfileSetup from "@/components/auth/ProfileSetup";
import { isUserOnboarded } from "@/lib/helpers/profile-completion";
import useAuthStore from "@/stores/auth";
import WorkspaceOnboardingFlow from "./workspace-onboarding-flow";

const OnboardingRouteGate = () => {
  const { user } = useAuthStore();

  if (!isUserOnboarded(user)) {
    return <ProfileSetup />;
  }

  return <WorkspaceOnboardingFlow />;
};

export default OnboardingRouteGate;

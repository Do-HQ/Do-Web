import OnboardingContainer from "@/components/containers/OnboardingContainer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Create your profile and workspace",
}

const OnboardingPage = () => {
  return <OnboardingContainer />
}

export default OnboardingPage

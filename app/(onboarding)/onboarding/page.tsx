import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ROUTES } from "@/utils/constants";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Onboarding is currently disabled.",
};

const OnboardingPage = () => {
  redirect(ROUTES.DASHBOARD);
};

export default OnboardingPage;

import AuthFlow from "@/components/auth/AuthFlow";
import LoaderComponent from "@/components/shared/loader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Log in to Squircle",
  description:
    "Access your agentic workspace and start collaborating with your team",
};

const LogInPage = () => {
  return (
    <Suspense fallback={<LoaderComponent />}>
      <AuthFlow mode="login" step="email" />
    </Suspense>
  );
};

export default LogInPage;

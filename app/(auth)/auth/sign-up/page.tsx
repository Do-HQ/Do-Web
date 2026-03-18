import AuthFlow from "@/components/auth/AuthFlow";
import LoaderComponent from "@/components/shared/loader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Create your Squircle account",
  description: "Sign up to start collaborating in your agentic workspace",
};

const SignUpPage = () => {
  return (
    <Suspense fallback={<LoaderComponent />}>
      <AuthFlow mode="signup" step="email" />
    </Suspense>
  );
};

export default SignUpPage;

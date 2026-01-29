import AuthFlow from "@/components/auth/AuthFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your Squircle account",
  description: "Sign up to start collaborating in your agentic workspace",
};

const SignUpPage = () => {
  return <AuthFlow mode="signup" step="email" />;
};

export default SignUpPage;

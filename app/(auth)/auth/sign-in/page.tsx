import AuthFlow from "@/components/auth/AuthFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in to Squircle",
  description:
    "Access your agentic workspace and start collaborating with your team",
};

const LogInPage = () => {
  return <AuthFlow mode="login" step="email" />;
};

export default LogInPage;

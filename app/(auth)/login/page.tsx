import LogInContainer from "@/components/containers/LogInContainer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in to Squircle",
  description: "Access your agentic workspace and start collaborating with your team",
};

const LogInPage = () => {
  return <LogInContainer />;
};

export default LogInPage;
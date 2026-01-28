import AuthFlow from "@/components/auth/AuthFlow";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify your Squircle OTP",
  description: "Verify the OTP we sent you to access your projects.",
};

const page = () => {
  return <AuthFlow step="verify" />;
};

export default page;

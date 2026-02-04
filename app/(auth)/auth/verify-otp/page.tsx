import AuthFlow from "@/components/auth/AuthFlow";
import LoaderComponent from "@/components/shared/loader";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verify your Squircle OTP",
  description: "Verify the OTP we sent you to access your projects.",
};

const page = () => {
  return (
    <Suspense fallback={<LoaderComponent />}>
      <AuthFlow step="verify" />
    </Suspense>
  );
};

export default page;

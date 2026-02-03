"use client";

import React from "react";
import ProfileSetup from "../auth/ProfileSetup";

type Step = "profile" | "workspace";

const OnboardingContainer = () => {
  const [step, setStep] = React.useState<Step>("profile");

  return (
    <>
      {step === "profile" && (
        <ProfileSetup onNext={() => setStep("workspace")} />
      )}
    </>
  );
};

export default OnboardingContainer;
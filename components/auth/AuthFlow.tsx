"use client";

import VerificationCode from "./VerificationCode";
import Auth from "./Auth";

interface Props {
  mode?: "signup" | "login";
  step: "email" | "verify";
}

const AuthFlow = ({ mode, step = "email" }: Props) => {
  return (
    <section>
      {step === "email" && <Auth mode={mode} />}
      {step === "verify" && <VerificationCode />}
    </section>
  );
};

export default AuthFlow;

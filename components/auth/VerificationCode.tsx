"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/shared/input/otp-input";

const VerificationCode = ({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) => {
  const [code, setCode] = React.useState("");
  const [seconds, setSeconds] = React.useState(60);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  };

  return (
    <>
      <div className="text-center space-y-1">
        <h1 className="text-lg font-semibold text-foreground mb-4">
          Check your email
        </h1>
        <p className="text-xs text-muted-foreground">
          We sent a verification code <br />
          Please check your inbox at{" "}
          <strong className="text-primary/90">{email}</strong>
          <Button
            variant={"link"}
            onClick={onBack}
            className="block w-full underline"
          >
            Change email
          </Button>
        </p>
      </div>

      <div className="space-y-6 w-full">
        <OTPInput count={6} value={code} onChange={setCode} />
        <div className="space-y-2.5">
          <Button
            className="w-full"
            disabled={loading || code.length < 6}
            onClick={handleVerify}
          >
            {loading ? "Verifying..." : "Verify code"}
          </Button>

          {seconds > 0 ? (
            <p className="text-center text-xs text-muted-foreground space-y-1">Resend code in {seconds}s</p>
          ) : (
            <Button className="w-full" variant={"ghost"}>
              Resend code
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default VerificationCode;
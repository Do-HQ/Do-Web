"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/shared/input/otp-input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/stores/auth";

const VerificationCode = () => {
  // States
  const [code, setCode] = React.useState("");
  const [seconds, setSeconds] = React.useState(5);
  const [loading, setLoading] = React.useState(false);

  // Router
  const router = useRouter();

  // Store
  const { user } = useAuthStore();

  // Handlers
  const handleVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  };

  const handleReturn = () => {
    router.back();
  };

  const handleResend = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));

    // * If Sign up, ee can use the confetti (triggerConfetti())
    toast.success(
      `A new OTP has been sent to ${user?.email || "your email addresss"} `,
      {
        description: "Please check your inbox or spam for our email",
      },
    );
    setLoading(false);
  };

  // Effects
  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <>
      <div className="text-center space-y-1">
        <h1 className="text-lg font-semibold text-foreground mb-4">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification code. Please check your inbox at{" "}
          <strong className="text-primary/90">{user?.email}</strong>
          <Button
            variant={"link"}
            onClick={handleReturn}
            className="block w-full underline"
          >
            Change email
          </Button>
        </p>
      </div>

      <div className="space-y-6 w-full">
        <OTPInput count={6} value={code} onChange={setCode} />
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={loading || code.length < 6}
            onClick={handleVerify}
            loading={loading}
          >
            {loading ? "Verifying..." : "Verify code"}
          </Button>

          {seconds > 0 ? (
            <p className="text-center text-xs text-muted-foreground space-y-1">
              Resend code in {seconds}s
            </p>
          ) : (
            <Button className="w-full" variant={"ghost"} onClick={handleResend}>
              Resend code
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default VerificationCode;

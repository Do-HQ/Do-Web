"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OTPInput } from "@/components/shared/input/otp-input";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/stores/auth";
import { H1, P } from "../ui/typography";
import useAuth from "@/hooks/use-auth";
import { resolveUserStartRoute } from "@/lib/helpers/user-preferences";
import { consumePendingAuthRedirect } from "@/lib/helpers/auth-redirect";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

const VerificationCode = () => {
  // States
  const [code, setCode] = React.useState("");
  const [seconds, setSeconds] = React.useState(60);
  const [authEmail, setAuthEmail] = React.useState("");

  // Router
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent");
  const emailFromQuery = String(params.get("email") || "")
    .trim()
    .toLowerCase();

  // Store
  const { user, setUser } = useAuthStore();

  // Hooks
  const { useOtp, useValidateOtp } = useAuth();

  const { isPending: isPendingGetOTP, mutate: getOTP } = useOtp({
    onSuccess(_, variables) {
      toast.success(
        `A new OTP has been sent to ${variables?.email || "your email addresss"} `,
        {
          description: "Please check your inbox or spam for our email",
        },
      );
      setCode("");
    },
    onError() {
      setCode("");
    },
  });

  const { isPending: isPendingVerifyOtp, mutate: verifyOtp } = useValidateOtp({
    onSuccess(data) {
      toast.success(data?.data?.message, {
        description: data?.data?.description,
      });

      localStorage.setItem(LOCAL_KEYS.TOKEN, data?.data?.token);
      localStorage.setItem(LOCAL_KEYS.REFRESH_TOKEN, data?.data?.refreshToken);
      localStorage.removeItem(LOCAL_KEYS.PENDING_AUTH_EMAIL);

      setUser(data?.data?.user);

      const pendingRedirect = consumePendingAuthRedirect();
      if (pendingRedirect) {
        router.replace(pendingRedirect);
        return;
      }

      if (!data?.data?.user?.firstName) {
        router.push(ROUTES.ONBOARDING);
        return;
      }

      if (!data?.data?.user?.currentWorkspaceId) {
        router.push(ROUTES.SWITCH_WORKSPACE);
        return;
      }

      router.replace(
        resolveUserStartRoute({
          user: data?.data?.user,
          workspaceId: data?.data?.user?.currentWorkspaceId?._id,
        }),
      );
    },
    onError() {
      setCode("");
    },
  });

  // Handlers
  const handleResend = async () => {
    if (!authEmail) {
      toast.error("Missing verification email", {
        description: "Please return and enter your email again.",
      });
      router.replace(ROUTES.SIGN_IN);
      return;
    }
    getOTP({
      email: authEmail,
      intent: intent!,
    });
  };

  const handleVerify = async () => {
    if (!authEmail) {
      toast.error("Missing verification email", {
        description: "Please return and enter your email again.",
      });
      router.replace(ROUTES.SIGN_IN);
      return;
    }
    verifyOtp({
      email: authEmail,
      code,
      intent: intent!,
    });
  };

  const handleReturn = () => {
    router.back();
  };

  // Effects
  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    const emailFromStore = String(user?.email || "").trim().toLowerCase();
    const emailFromStorage = String(
      localStorage.getItem(LOCAL_KEYS.PENDING_AUTH_EMAIL) || "",
    )
      .trim()
      .toLowerCase();
    const resolvedEmail = emailFromStore || emailFromStorage || emailFromQuery;

    if (resolvedEmail) {
      setAuthEmail(resolvedEmail);
      localStorage.setItem(LOCAL_KEYS.PENDING_AUTH_EMAIL, resolvedEmail);
      if (!emailFromStore) {
        setUser({ email: resolvedEmail });
      }
    }
  }, [emailFromQuery, setUser, user?.email]);

  return (
    <>
      <div className="text-center space-y-4">
        <H1 className="font-semibold md:text-2xl text-foreground">
          Check your email
        </H1>

        <P className="text-muted-foreground font-medium">
          We sent a verification code. Please check your inbox at{" "}
          <strong className="text-primary/90">{authEmail || "your email"}</strong>
          <Button
            variant={"link"}
            onClick={handleReturn}
            className="block w-full underline"
          >
            Change email
          </Button>
        </P>
      </div>

      <div className="space-y-8 w-full mt-4">
        <OTPInput count={6} value={code} onChange={setCode} />
        <div className="space-y-3">
          <Button
            className="w-full"
            disabled={isPendingVerifyOtp || code.length < 6 || !authEmail}
            onClick={handleVerify}
            loading={isPendingVerifyOtp}
          >
            Verify code
          </Button>

          {seconds > 0 ? (
            <p className="text-center text-xs text-muted-foreground space-y-1">
              Resend code in {seconds}s
            </p>
          ) : (
            <Button
              className="w-full"
              variant={"ghost"}
              onClick={handleResend}
              loading={isPendingGetOTP}
            >
              Resend code
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default VerificationCode;

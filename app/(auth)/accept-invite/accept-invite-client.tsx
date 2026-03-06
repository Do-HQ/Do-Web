"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import useWorkspace from "@/hooks/use-workspace";
import LoaderComponent from "@/components/shared/loader";
import { Button } from "@/components/ui/button";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const attemptedRef = useRef(false);
  const { useAcceptWorkspaceInvite } = useWorkspace();
  const acceptInvite = useAcceptWorkspaceInvite();

  const attemptAcceptInvite = useCallback(() => {
    attemptedRef.current = true;

    const request = acceptInvite.mutateAsync({ token });

    toast.promise(request, {
      loading: "Accepting workspace invite...",
      success: (response) =>
        response?.data?.message || "Workspace invite accepted successfully",
      error: "We could not accept this workspace invite.",
    });

    return request
      .then(() => {
        router.replace(ROUTES.DASHBOARD);
      })
      .catch(() => {
        attemptedRef.current = false;
      });
  }, [acceptInvite, router, token]);

  useEffect(() => {
    if (attemptedRef.current || !token) {
      return;
    }

    const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);

    if (!accessToken) {
      localStorage.setItem(LOCAL_KEYS.REDIRECT, `/accept-invite?token=${token}`);
      router.replace(ROUTES.SIGN_IN);
      return;
    }

    void attemptAcceptInvite();
  }, [attemptAcceptInvite, router, token]);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">Invalid invite link</div>
        <p className="text-sm text-muted-foreground">
          This workspace invite is missing its token or is no longer valid.
        </p>
        <Button type="button" variant="outline" onClick={() => router.replace(ROUTES.BASE_URL)}>
          Go back
        </Button>
      </div>
    );
  }

  if (acceptInvite.isError) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">We could not accept this invite</div>
        <p className="text-sm text-muted-foreground">
          Try again once you are signed in, or ask for a fresh invite.
        </p>
        <Button
          type="button"
          onClick={() => {
            attemptedRef.current = false;
            void attemptAcceptInvite();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return <LoaderComponent />;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import useWorkspace from "@/hooks/use-workspace";
import LoaderComponent from "@/components/shared/loader";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/stores/auth";
import { resolveUserStartRoute } from "@/lib/helpers/user-preferences";
import { rememberPendingAuthRedirect } from "@/lib/helpers/auth-redirect";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { getUser } from "@/lib/services/user-service";

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const attemptedRef = useRef(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const { user, setUser } = useAuthStore();
  const { useAcceptWorkspaceInvite } = useWorkspace();
  const acceptInvite = useAcceptWorkspaceInvite();

  const invitePath = `/accept-invite?token=${encodeURIComponent(token)}`;
  const saveInviteRedirect = useCallback(() => {
    if (!token) {
      return;
    }
    rememberPendingAuthRedirect(invitePath);
  }, [invitePath, token]);

  const attemptAcceptInvite = useCallback(() => {
    attemptedRef.current = true;
    setRequiresAuth(false);

    const request = acceptInvite.mutateAsync({ token });

    toast.promise(request, {
      loading: "Accepting workspace invite...",
      success: (response) =>
        response?.data?.message || "Workspace invite accepted successfully",
      error: "We could not accept this workspace invite.",
    });

    return request
      .then(async () => {
        const response = await getUser();
        const nextUser = response?.data?.user;

        if (nextUser) {
          setUser(nextUser);

          if (!nextUser?.firstName) {
            router.replace(ROUTES.ONBOARDING);
            return;
          }

          if (!nextUser?.currentWorkspaceId) {
            router.replace(ROUTES.SWITCH_WORKSPACE);
            return;
          }
        }

        router.replace(
          resolveUserStartRoute({
            user: nextUser || user,
            workspaceId: nextUser?.currentWorkspaceId?._id,
          }),
        );
      })
      .catch(() => {
        attemptedRef.current = false;
      });
  }, [acceptInvite, router, setUser, token, user]);

  useEffect(() => {
    if (attemptedRef.current || !token) {
      return;
    }

    const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);

    if (!accessToken) {
      saveInviteRedirect();
      setRequiresAuth(true);
      return;
    }

    void attemptAcceptInvite();
  }, [attemptAcceptInvite, saveInviteRedirect, token]);

  if (requiresAuth) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">Accept your workspace invite</div>
        <p className="text-sm text-muted-foreground">
          You need a Squircle account to accept this invite. Sign in if you
          already have one, or sign up and we will accept this invite right
          after verification.
        </p>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              saveInviteRedirect();
              router.replace(ROUTES.SIGN_IN);
            }}
          >
            Sign in
          </Button>
          <Button
            type="button"
            onClick={() => {
              saveInviteRedirect();
              router.replace(ROUTES.SIGN_UP);
            }}
          >
            Sign up
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              saveInviteRedirect();
              router.replace(ROUTES.SIGN_IN);
            }}
          >
            Sign in
          </Button>
          <Button
            type="button"
            onClick={() => {
              saveInviteRedirect();
              router.replace(ROUTES.SIGN_UP);
            }}
          >
            Sign up
          </Button>
        </div>
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

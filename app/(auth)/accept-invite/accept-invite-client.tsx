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
import axiosInstance from "@/lib/services";

interface InvitePreview {
  email: string;
  workspaceName: string;
}

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const attemptedRef = useRef(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(
    null,
  );
  const [previewFetched, setPreviewFetched] = useState(false);
  const { user, setUser } = useAuthStore();
  const { useAcceptWorkspaceInvite } = useWorkspace();
  const acceptInvite = useAcceptWorkspaceInvite();

  const invitePath = `/accept-invite?token=${encodeURIComponent(token)}`;
  const saveInviteRedirect = useCallback(() => {
    if (!token) return;
    rememberPendingAuthRedirect(invitePath);
  }, [invitePath, token]);

  // Fetch invite metadata (public endpoint — no auth needed) so we can show
  // the workspace name and catch email mismatches before firing the accept.
  useEffect(() => {
    if (!token) return;
    axiosInstance
      .get<InvitePreview>(`/public/invites/${token}`)
      .then((res) => setInvitePreview(res.data))
      .catch(() => {})
      .finally(() => setPreviewFetched(true));
  }, [token]);

  const attemptAcceptInvite = useCallback(() => {
    attemptedRef.current = true;
    setRequiresAuth(false);
    setEmailMismatch(null);

    const request = acceptInvite.mutateAsync({ token });

    toast.promise(request, {
      loading: "Accepting workspace invite...",
      success: (response) =>
        response?.data?.message || "Workspace invite accepted successfully",
      error: (err) =>
        err?.response?.data?.description ||
        "We could not accept this workspace invite.",
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
      .catch(() => {});
  }, [acceptInvite, router, setUser, token, user]);

  useEffect(() => {
    if (attemptedRef.current || !token) return;

    const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);

    if (!accessToken) {
      saveInviteRedirect();
      setRequiresAuth(true);
      return;
    }

    // Wait for the preview fetch to complete before attempting accept so we
    // can catch email mismatches before hitting the backend.
    if (!previewFetched) return;

    if (invitePreview && user?.email) {
      if (invitePreview.email.toLowerCase() !== user.email.toLowerCase()) {
        setEmailMismatch(invitePreview.email);
        return;
      }
    }

    void attemptAcceptInvite();
  }, [
    attemptAcceptInvite,
    invitePreview,
    previewFetched,
    saveInviteRedirect,
    token,
    user,
  ]);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">Invalid invite link</div>
        <p className="text-sm text-muted-foreground">
          This workspace invite is missing its token or is no longer valid.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace(ROUTES.BASE_URL)}
        >
          Go back
        </Button>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">Wrong account</div>
        <p className="text-sm text-muted-foreground">
          This invite was sent to{" "}
          <span className="font-medium">{emailMismatch}</span> but you are
          signed in as <span className="font-medium">{user?.email}</span>. Sign
          in with the correct account to accept this invite.
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
            Sign in with {emailMismatch}
          </Button>
        </div>
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">
          {invitePreview?.workspaceName
            ? `You have been invited to ${invitePreview.workspaceName}`
            : "Accept your workspace invite"}
        </div>
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

  if (acceptInvite.isError) {
    const errorMsg =
      (acceptInvite.error as { response?: { data?: { description?: string } } })
        ?.response?.data?.description || "";

    return (
      <div className="space-y-4 text-center">
        <div className="text-base font-medium">
          We could not accept this invite
        </div>
        <p className="text-sm text-muted-foreground">
          {errorMsg ||
            "Try again once you are signed in, or ask for a fresh invite."}
        </p>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            onClick={() => {
              attemptedRef.current = false;
              void attemptAcceptInvite();
            }}
            variant="secondary"
          >
            Try again
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

  return <LoaderComponent />;
}

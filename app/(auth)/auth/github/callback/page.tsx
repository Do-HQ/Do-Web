"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import LoaderComponent from "@/components/shared/loader";
import { consumePendingAuthRedirect } from "@/lib/helpers/auth-redirect";
import { resolveUserStartRoute } from "@/lib/helpers/user-preferences";
import { getUser } from "@/lib/services/user-service";
import useAuthStore from "@/stores/auth";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

const GithubAuthCallbackPage = () => {
  const router = useRouter();
  const handledRef = useRef(false);
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = String(hashParams.get("token") || "").trim();
    const refreshToken = String(hashParams.get("refreshToken") || "").trim();
    const csrfToken = String(hashParams.get("csrfToken") || "").trim();

    if (!token || !refreshToken) {
      toast.error("GitHub sign-in failed", {
        description: "Missing authentication session. Please try again.",
      });
      router.replace(ROUTES.SIGN_IN);
      return;
    }

    localStorage.setItem(LOCAL_KEYS.TOKEN, token);
    localStorage.setItem(LOCAL_KEYS.REFRESH_TOKEN, refreshToken);
    if (csrfToken) {
      localStorage.setItem(LOCAL_KEYS.CSRF_TOKEN, csrfToken);
    }
    window.history.replaceState({}, document.title, window.location.pathname);

    const bootstrap = async () => {
      try {
        const response = await getUser();
        const user = response?.data?.user;

        setUser(user);
        toast.success("Signed in with GitHub");

        const pendingRedirect = consumePendingAuthRedirect();
        if (pendingRedirect) {
          router.replace(pendingRedirect);
          return;
        }

        if (!user?.firstName) {
          router.replace(ROUTES.ONBOARDING);
          return;
        }

        if (!user?.currentWorkspaceId) {
          router.replace(ROUTES.SWITCH_WORKSPACE);
          return;
        }

        router.replace(
          resolveUserStartRoute({
            user,
            workspaceId: user?.currentWorkspaceId?._id,
          }),
        );
      } catch {
        localStorage.removeItem(LOCAL_KEYS.TOKEN);
        localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
        setUser(null);

        toast.error("GitHub sign-in failed", {
          description: "We could not complete your session. Please try again.",
        });
        router.replace(ROUTES.SIGN_IN);
      }
    };

    bootstrap();
  }, [router, setUser]);

  return <LoaderComponent />;
};

export default GithubAuthCallbackPage;

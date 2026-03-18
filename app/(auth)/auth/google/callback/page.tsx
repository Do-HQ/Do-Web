"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import LoaderComponent from "@/components/shared/loader";
import { getUser } from "@/lib/services/user-service";
import useAuthStore from "@/stores/auth";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { toast } from "sonner";

const GoogleAuthCallbackPage = () => {
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

    if (!token || !refreshToken) {
      toast.error("Google sign-in failed", {
        description: "Missing authentication session. Please try again.",
      });
      router.replace(ROUTES.SIGN_IN);
      return;
    }

    localStorage.setItem(LOCAL_KEYS.TOKEN, token);
    localStorage.setItem(LOCAL_KEYS.REFRESH_TOKEN, refreshToken);
    window.history.replaceState({}, document.title, window.location.pathname);

    const bootstrap = async () => {
      try {
        const response = await getUser();
        const user = response?.data?.user;

        setUser(user);
        toast.success("Signed in with Google");

        if (!user?.firstName) {
          router.replace(ROUTES.ONBOARDING);
          return;
        }

        if (!user?.currentWorkspaceId) {
          router.replace(ROUTES.SWITCH_WORKSPACE);
          return;
        }

        router.replace(ROUTES.DASHBOARD);
      } catch {
        localStorage.removeItem(LOCAL_KEYS.TOKEN);
        localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
        setUser(null);

        toast.error("Google sign-in failed", {
          description: "We could not complete your session. Please try again.",
        });
        router.replace(ROUTES.SIGN_IN);
      }
    };

    bootstrap();
  }, [router, setUser]);

  return <LoaderComponent />;
};

export default GoogleAuthCallbackPage;

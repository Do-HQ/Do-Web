"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import LoaderComponent from "@/components/shared/loader";
import { getUser } from "@/lib/services/user-service";
import { getUserWorkspaces } from "@/lib/services/workspace-service";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

type RequireAuthProps = {
  children: React.ReactNode;
};

const STALE_TIME = 5 * 60 * 1000;

const RequireAuth = ({ children }: RequireAuthProps) => {
  const router = useRouter();
  const redirectHandledRef = useRef(false);

  const { setUser } = useAuthStore();
  const { setWorkspaceId, setWorkspaces } = useWorkspaceStore();

  const [authChecked, setAuthChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAccessToken(localStorage.getItem(LOCAL_KEYS.TOKEN));
      setAuthChecked(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const shouldBootstrap = authChecked && !!accessToken;

  const userQuery = useQuery({
    queryKey: ["user", accessToken],
    queryFn: async () => {
      const res = await getUser();

      setUser(res.data.user);
      setWorkspaceId(res.data.user?.currentWorkspaceId?._id ?? null);

      return res.data.user;
    },
    retryOnMount: false,
    retry: false,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: shouldBootstrap,
  });

  const workspacesQuery = useQuery({
    queryKey: ["get-user-workspaces", accessToken],
    queryFn: async () => {
      const res = await getUserWorkspaces({ page: 1, limit: 100 });
      setWorkspaces(res?.data?.workspaces ?? []);

      return res?.data?.workspaces ?? [];
    },
    retryOnMount: false,
    retry: false,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: shouldBootstrap,
  });

  const hasBootstrapError =
    shouldBootstrap && (userQuery.isError || workspacesQuery.isError);
  const isBootstrapping =
    shouldBootstrap && (userQuery.isPending || workspacesQuery.isPending);
  const shouldRedirectToSignIn =
    authChecked && (!accessToken || hasBootstrapError);

  useEffect(() => {
    if (!shouldRedirectToSignIn || redirectHandledRef.current) {
      return;
    }

    redirectHandledRef.current = true;

    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem(LOCAL_KEYS.REDIRECT, currentPath);
      localStorage.removeItem(LOCAL_KEYS.TOKEN);
      localStorage.removeItem(LOCAL_KEYS.REFRESH_TOKEN);
    }

    setUser(null);
    setWorkspaceId(null);
    setWorkspaces([]);
    router.replace(ROUTES.SIGN_IN);
  }, [
    router,
    setUser,
    setWorkspaceId,
    setWorkspaces,
    shouldRedirectToSignIn,
  ]);

  if (!authChecked || isBootstrapping || shouldRedirectToSignIn) {
    return <LoaderComponent />;
  }

  return children;
};

export default RequireAuth;

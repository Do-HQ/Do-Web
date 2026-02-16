"use client";

import React, { useEffect } from "react";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/services/user-service";
import LoaderComponent from "@/components/shared/loader";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import { useQuery } from "@tanstack/react-query";
import { getUserWorkspaces } from "@/lib/services/workspace-service";

type RequireAuthProps = {
  children: React.ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  // Router
  const router = useRouter();

  // Global
  const { user, setUser } = useAuthStore();
  const { setWorkspaceId, setWorkspaces } = useWorkspaceStore();

  // Local
  const accessToken =
    typeof window !== "undefined" && localStorage.getItem(LOCAL_KEYS.TOKEN);

  // Query
  const { isPending } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const res = await getUser();

        setUser(res.data.user);
        setWorkspaceId(res.data.user?.currentWorkspaceId?._id);

        return res.data.user;
      } catch (err) {
        // localStorage.removeItem(LOCAL_KEYS.TOKEN);
        // router.replace(ROUTES.SIGN_IN);

        throw err;
      }
    },
    retry: false,
    enabled: !!accessToken,
  });

  const { isPending: isGettingUsersWorkspaces } = useQuery({
    queryKey: ["user-workspaces"],
    queryFn: async () => {
      try {
        const res = await getUserWorkspaces({ page: 1, limit: 100 });
        setWorkspaces(res?.data?.workspaces);
      } catch (err) {
        // localStorage.removeItem(LOCAL_KEYS.TOKEN);
        // router.replace(ROUTES.SIGN_IN);

        throw err;
      }
    },
    retry: false,
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!accessToken) {
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken && !user && !isPending) {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem(LOCAL_KEYS.REDIRECT, currentPath);
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken, user]);

  if (isPending || isGettingUsersWorkspaces) {
    return <LoaderComponent />;
  }

  return children;
};

export default RequireAuth;

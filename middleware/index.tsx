"use client";

import React, { useEffect } from "react";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import useError from "@/hooks/use-error";
import { AxiosError } from "axios";
import { getUser } from "@/lib/services/user-service";
import LoaderComponent from "@/components/shared/loader";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";

type RequireAuthProps = {
  children: React.ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  // Router
  const router = useRouter();

  // Global
  const { user, setUser } = useAuthStore();
  const { setWorkspaceId } = useWorkspaceStore();

  // Custom Hooks
  const { handleError } = useError();

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
        localStorage.removeItem(LOCAL_KEYS.TOKEN);
        router.replace(ROUTES.SIGN_IN);

        throw err;
      }
    },
    retry: false,
    enabled: !!accessToken,
  });

  console.log(accessToken, "Tokennn");

  useEffect(() => {
    if (!accessToken) {
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken]);

  console.log(user, "Checl");

  useEffect(() => {
    if (!accessToken && !user && !isPending) {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem(LOCAL_KEYS.REDIRECT, currentPath);
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken, user]);

  if (isPending) {
    return <LoaderComponent />;
  }

  return children;
};

export default RequireAuth;

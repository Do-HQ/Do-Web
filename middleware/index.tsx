"use client";

import React, { useEffect } from "react";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import useError from "@/hooks/use-error";
import { AxiosError } from "axios";
import { getUser } from "@/lib/services/user-service";
import LoaderComponent from "@/components/shared/loader";
import useAuthStore from "@/stores/auth";

type RequireAuthProps = {
  children: React.ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  // Router
  const router = useRouter();

  // Global
  const { user, setUser } = useAuthStore();

  // Custom Hooks
  const { handleError } = useError();

  // Query
  const mutation = useMutation({
    mutationFn: getUser,
    onSuccess: (res) => {
      console.log(res, "Response");
      setUser(res.data.user);
    },
    onError: (err) => {
      localStorage.removeItem(LOCAL_KEYS.TOKEN);
      router.replace(ROUTES.SIGN_IN);
      handleError(err as AxiosError);
    },
  });

  // Local
  const accessToken =
    typeof window !== "undefined" && localStorage.getItem(LOCAL_KEYS.TOKEN);

  console.log(accessToken, "Tokennn");

  useEffect(() => {
    if (accessToken) {
      mutation.mutate();
    } else {
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken]);

  console.log(user, "Checl");

  useEffect(() => {
    if (!accessToken && !user && !mutation?.isPending) {
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem(LOCAL_KEYS.REDIRECT, currentPath);
      router.replace(ROUTES.SIGN_IN);
    }
  }, [accessToken, user]);

  if (mutation?.isPending) {
    return <LoaderComponent />;
  }

  return children;
};

export default RequireAuth;

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LoaderComponent from "@/components/shared/loader";
import { LOCAL_KEYS, ROUTES } from "@/utils/constants";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const accessToken = localStorage.getItem(LOCAL_KEYS.TOKEN);
      router.replace(accessToken ? ROUTES.DASHBOARD : ROUTES.SIGN_IN);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  return <LoaderComponent />;
}

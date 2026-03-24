"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import useAuthStore from "@/stores/auth";
import { getUserPreferences } from "@/lib/helpers/user-preferences";

const UserPreferencesSync = () => {
  const { user } = useAuthStore();
  const { setTheme } = useTheme();
  const preferences = getUserPreferences(user);

  useEffect(() => {
    setTheme(preferences.appearance.theme);
  }, [preferences.appearance.theme, setTheme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.reduceMotion = preferences.appearance.reduceMotion
      ? "true"
      : "false";
  }, [preferences.appearance.reduceMotion]);

  return null;
};

export default UserPreferencesSync;

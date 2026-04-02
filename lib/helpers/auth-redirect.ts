import { LOCAL_KEYS } from "@/utils/constants";

const isSafeAppPath = (value: string) => {
  return value.startsWith("/") && !value.startsWith("//");
};

export const rememberPendingAuthRedirect = (path: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPath = String(path || "").trim();
  if (!normalizedPath || !isSafeAppPath(normalizedPath)) {
    return;
  }

  localStorage.setItem(LOCAL_KEYS.REDIRECT, normalizedPath);
};

export const consumePendingAuthRedirect = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const rawValue = String(localStorage.getItem(LOCAL_KEYS.REDIRECT) || "").trim();
  localStorage.removeItem(LOCAL_KEYS.REDIRECT);

  if (!rawValue || !isSafeAppPath(rawValue)) {
    return "";
  }

  return rawValue;
};

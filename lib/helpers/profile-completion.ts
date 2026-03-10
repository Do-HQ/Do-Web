import { AuthUser } from "@/types/auth";

export const PROFILE_COMPLETION_FIELDS = [
  { key: "phoneNumber", label: "Phone number" },
  { key: "addressLine1", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
] as const;

type CompletionKey = (typeof PROFILE_COMPLETION_FIELDS)[number]["key"];

type ProfileCompletionShape = {
  [K in CompletionKey]?: string | null;
};

export const getMissingProfileCompletionFields = (
  value?: ProfileCompletionShape | null,
) => {
  return PROFILE_COMPLETION_FIELDS.filter((field) => {
    const rawValue = value?.[field.key];
    return String(rawValue ?? "").trim().length === 0;
  });
};

export const isUserOnboarded = (user?: AuthUser | null) => {
  if (!user) {
    return false;
  }

  const hasIdentity = Boolean(
    String(user.firstName ?? "").trim() && String(user.lastName ?? "").trim(),
  );

  const hasWorkspace = Array.isArray(user.workspaces) && user.workspaces.length > 0;

  return hasIdentity && hasWorkspace;
};

export const shouldShowProfileCompletionIndicator = (user?: AuthUser | null) => {
  if (!isUserOnboarded(user)) {
    return false;
  }

  return getMissingProfileCompletionFields(user).length > 0;
};


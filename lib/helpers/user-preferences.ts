import type { AuthUser, UserPreferences, UserStartPagePreference } from "@/types/auth";
import { ROUTES } from "@/utils/constants";
import { getRecentVisits } from "./recent-visits";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  appearance: {
    theme: "system",
    reduceMotion: false,
  },
  workspace: {
    startPage: "home",
  },
};

const resolveStartPage = (
  value?: string | null,
): UserStartPagePreference => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "home" ||
    normalized === "my-tasks" ||
    normalized === "inbox" ||
    normalized === "last-visited"
  ) {
    return normalized;
  }

  return DEFAULT_USER_PREFERENCES.workspace.startPage;
};

export const getUserPreferences = (
  user?: Pick<AuthUser, "preferences"> | null,
): UserPreferences => {
  const appearance = user?.preferences?.appearance;
  const workspace = user?.preferences?.workspace;

  return {
    appearance: {
      theme:
        appearance?.theme === "light" ||
        appearance?.theme === "dark" ||
        appearance?.theme === "system"
          ? appearance.theme
          : DEFAULT_USER_PREFERENCES.appearance.theme,
      reduceMotion:
        typeof appearance?.reduceMotion === "boolean"
          ? appearance.reduceMotion
          : DEFAULT_USER_PREFERENCES.appearance.reduceMotion,
    },
    workspace: {
      startPage: resolveStartPage(workspace?.startPage),
    },
  };
};

export const resolveUserStartRoute = ({
  user,
  workspaceId,
}: {
  user?: Pick<AuthUser, "preferences" | "currentWorkspaceId"> | null;
  workspaceId?: string | null;
}) => {
  const preferences = getUserPreferences(user);
  const startPage = preferences.workspace.startPage;

  if (startPage === "my-tasks") {
    return `${ROUTES.DASHBOARD}?focus=my-tasks`;
  }

  if (startPage === "inbox") {
    return ROUTES.SPACES;
  }

  if (startPage === "last-visited") {
    const resolvedWorkspaceId =
      String(
        workspaceId ||
          (typeof user?.currentWorkspaceId === "object"
            ? user.currentWorkspaceId?._id
            : user?.currentWorkspaceId) ||
          "",
      ).trim();

    if (resolvedWorkspaceId) {
      const [recentEntry] = getRecentVisits(resolvedWorkspaceId, 1);
      if (recentEntry?.href) {
        return recentEntry.href;
      }
    }
  }

  return ROUTES.DASHBOARD;
};

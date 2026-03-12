export const ROUTES = {
  BASE_URL: "/",
  SIGN_IN: "/auth/sign-in",
  SIGN_UP: "/auth/sign-up",
  VERIFY_OTP: "/auth/verify-otp",
  DASHBOARD: "/dashboard",
  CALENDAR: "/calendar",
  PROJECTS: "/projects",
  ASK_SQUIRCLE: "/ask-squircle",
  JAMS: "/jams",
  SPACES: "/spaces",
  SPACES_TEAM_CALL: "/spaces/team-call",
  WORKSPACE: "/workspace",
  SWITCH_WORKSPACE: "/workspace/switch",
  CREATE_WORKSPACE: "/workspace/create",
  ONBOARDING: "/onboarding",
};

export const getProjectRoute = (projectId: string) =>
  `${ROUTES.PROJECTS}/${projectId}`;

export const LOCAL_KEYS = {
  TOKEN: "squircle-user-token",
  REFRESH_TOKEN: "squircle-refresh-token",
  REDIRECT: "squircle-redirect-path",
};

export const PAGE_LIMIT = 10;

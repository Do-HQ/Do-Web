export const ROUTES = {
  BASE_URL: "/",
  SIGN_IN: "/auth/sign-in",
  SIGN_UP: "/auth/sign-up",
  GOOGLE_AUTH_CALLBACK: "/auth/google/callback",
  VERIFY_OTP: "/auth/verify-otp",
  DASHBOARD: "/dashboard",
  CALENDAR: "/calendar",
  SUPPORT: "/support",
  SUPPORT_ADMIN: "/support/admin",
  ARCHIVE: "/archive",
  TEMPLATES: "/templates",
  DOCS: "/docs",
  KNOWLEDGE_BASE: "/knowledge-base",
  PORTFOLIO: "/portfolio",
  PROJECTS: "/projects",
  ASK_SQUIRCLE: "/ask-squircle",
  JAMS: "/jams",
  SPACES: "/spaces",
  SPACES_TEAM_CALL: "/spaces/team-call",
  WORKSPACE: "/workspace",
  SWITCH_WORKSPACE: "/workspace/switch",
  CREATE_WORKSPACE: "/workspace/create",
  ONBOARDING: "/onboarding",
  TABLE_OF_CONTENTS: "/toc",
};

export const getProjectRoute = (projectId: string) =>
  `${ROUTES.PROJECTS}/${projectId}`;

export const LOCAL_KEYS = {
  TOKEN: "squircle-user-token",
  REFRESH_TOKEN: "squircle-refresh-token",
  REDIRECT: "squircle-redirect-path",
  PENDING_AUTH_EMAIL: "squircle-pending-auth-email",
};

export const PAGE_LIMIT = 10;
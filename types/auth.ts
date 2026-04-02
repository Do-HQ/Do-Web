import type { CustomFile } from "./file";
import type { WorkspaceType } from "./workspace";

export interface UserType {
  email: string;
  firstname: string;
  lastnale: string;
}

export interface AuthData {
  email: string;
}

export interface GetOtpBody {
  email: string;
  intent: string;
}

export interface ValidateOtpBpdy {
  email: string;
  intent: string;
  code: string;
}

export type WorkspaceRole = "owner" | "admin" | "member";
export type UserThemePreference = "light" | "dark" | "system";
export type UserStartPagePreference =
  | "home"
  | "my-tasks"
  | "inbox"
  | "last-visited";

export interface UserPreferences {
  appearance: {
    theme: UserThemePreference;
    reduceMotion: boolean;
  };
  workspace: {
    startPage: UserStartPagePreference;
  };
}

export interface UserWorkspace {
  workspaceId: WorkspaceType;
  role: WorkspaceRole;
  _id: string;
}

export interface AuthUser {
  _id: string;
  email: string;
  isVerified: boolean;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneVerified: boolean;
  githubUsername?: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isInternal?: boolean;
  workspaces: UserWorkspace[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  profilePhoto: CustomFile | null;
  preferences?: UserPreferences;
  currentWorkspaceId: WorkspaceType;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

export interface UpdateUserBody {
  firstName?: string;
  lastName?: string;
  profilePhoto?: string | null;
  phoneNumber?: string;
  phoneVerified?: boolean;
  githubUsername?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LogoutRequestBody {
  refreshToken: string;
}

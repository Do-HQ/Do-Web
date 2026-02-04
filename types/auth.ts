import { CustomFile } from "./file";

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

export interface WorkspaceType {
  _id: string;
  name: string;
  type: string;
  ownerId: string;
  members: [string];
  slug: string;
  createdAt: string;
  updatedAt: string;
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
  workspaces: UserWorkspace[];
  createdAt: string;
  updatedAt: string;
  __v: number;
  profilePhoto: CustomFile;
  currentWorkspaceId: WorkspaceType;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

export interface UpdateUserBody {
  firstName: string;
  lastName: string;
  profilePhoto: string;
}

export interface LogoutRequestBody {
  refreshToken: string;
}

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

export interface UserWorkspace {
  workspaceId: string;
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

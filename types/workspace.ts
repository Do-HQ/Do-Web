import { workspaceSettingsSchema } from "@/lib/schemas/workspace";
import z from "zod";
import type { AuthUser, UserType } from "./auth";
import type { CustomFile } from "./file";

export interface WorkspaceFlowDefaults {
  projectDefaultView: "list" | "board" | "timeline";
  workflowTemplate: "lightweight" | "delivery" | "marketing" | "custom";
  requireWorkflowBeforeTasks: boolean;
  useTaskIdPrefix: boolean;
  teamVisibilityInProjects: "all" | "assigned-only";
}

export interface WorkspaceGovernanceSettings {
  allowMembersCreateProjects: boolean;
  allowMembersCreateWorkflows: boolean;
  restrictInvitesToAdmins: boolean;
  requireJoinRequestApproval: boolean;
  enableMessageExpiry: boolean;
  messageRetentionDays: number;
}

export interface WorkspaceKnowledgeBaseSourceIndexingSettings {
  indexWorkspaceDocs: boolean;
  indexProjectSpecs: boolean;
  indexTaskComments: boolean;
  includeCompletedProjects: boolean;
  indexingCadence: "daily" | "weekly" | "manual";
}

export interface WorkspaceKnowledgeBaseAgentBehaviorSettings {
  requireSourceCitation: boolean;
  allowSemanticSearchAcrossProjects: boolean;
  allowDraftAnswersFromPartialSources: boolean;
  autoSuggestRelatedDocs: boolean;
  responseDepth: "concise" | "balanced" | "detailed";
}

export interface WorkspaceKnowledgeBaseGovernanceSettings {
  allowMembersCreatePages: boolean;
  requireApprovalForPublishedPages: boolean;
  lockPagesAfterApproval: boolean;
  archiveStalePages: boolean;
  stalePageWindow: "30" | "60" | "90";
}

export interface WorkspaceKnowledgeBaseSettings {
  sourceIndexing: WorkspaceKnowledgeBaseSourceIndexingSettings;
  agentBehavior: WorkspaceKnowledgeBaseAgentBehaviorSettings;
  governance: WorkspaceKnowledgeBaseGovernanceSettings;
}

export interface WorkspaceWorkSchedule {
  enabled: boolean;
  timezone: string;
  startTime: string;
  closeTime: string;
  lastDigest?: {
    startSentOn?: string;
    closeSentOn?: string;
  };
}

export type WorkspaceOnboardingItemType =
  | "doc"
  | "knowledge-base"
  | "video"
  | "link";

export interface WorkspaceOnboardingKitItem {
  id: string;
  type: WorkspaceOnboardingItemType;
  title: string;
  description: string;
  required: boolean;
  docId?: string | null;
  articleId?: string | null;
  route?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  completed?: boolean;
}

export interface WorkspaceOnboardingKit {
  enabled: boolean;
  title: string;
  description: string;
  items: WorkspaceOnboardingKitItem[];
}

export interface WorkspaceOnboardingProgress {
  startedAt: string | null;
  completedAt: string | null;
  lastViewedAt: string | null;
  completedItemIds: string[];
  totalCount: number;
  completedCount: number;
  requiredCount: number;
  completedRequiredCount: number;
  percentComplete: number;
  allRequiredCompleted: boolean;
}

export interface WorkspaceOnboardingState {
  workspaceId: string;
  workspaceName: string;
  isWorkspaceOwner: boolean;
  shouldPrompt: boolean;
  kit: WorkspaceOnboardingKit;
  progress: WorkspaceOnboardingProgress;
}

export interface WorkspaceType {
  _id: string;
  name: string;
  type: string;
  logo?: CustomFile | null;
  ownerId: AuthUser;
  members: AuthUser[];
  slug: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  allowedDomains?: string[];
  flowDefaults?: WorkspaceFlowDefaults;
  governance?: WorkspaceGovernanceSettings;
  workSchedule?: WorkspaceWorkSchedule;
  knowledgeBase?: WorkspaceKnowledgeBaseSettings;
  onboardingKit?: WorkspaceOnboardingKit;
  plan?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
  tokens?: {
    balance: number;
    monthlyAllocation: number;
    lastRefillDate?: string | null;
  };
}

export interface JoinWorkspaceRequestBody {
  workspaceId: string;
}

export interface CreateWorkspaceRequestBody {
  name: string;
  type: string;
}

export interface CreateWorkspaceInviteRequestBody {
  email: string;
  roleIds: string[];
}

export type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;

export interface WorkspaceSettingsUpdateBody {
  name?: string;
  type?: string;
  logo?: string | null;
  allowedDomains?: string;
  flowDefaults?: Partial<WorkspaceFlowDefaults>;
  governance?: Partial<WorkspaceGovernanceSettings>;
  workSchedule?: Partial<WorkspaceWorkSchedule>;
  onboardingKit?: Partial<WorkspaceOnboardingKit>;
  knowledgeBase?: {
    sourceIndexing?: Partial<WorkspaceKnowledgeBaseSourceIndexingSettings>;
    agentBehavior?: Partial<WorkspaceKnowledgeBaseAgentBehaviorSettings>;
    governance?: Partial<WorkspaceKnowledgeBaseGovernanceSettings>;
  };
}

export interface WorkspaceInviteRequestBody {
  email: string;
  roles: string[];
}

export interface AcceptWorkspaceInviteRequestBody {
  token: string;
}

export interface RevokeWorkspaceInviteRequestBody {
  workspaceId: string;
  token: string;
  reason?: string;
}

export interface WorkspaceRole {
  _id: string;
  name: string;
}

export interface WorkspacePerson {
  _id: string;
  workspaceId: string;
  userId: AuthUser;
  roles: WorkspaceRole[];
  teams?: Array<{
    _id: string;
    name: string;
    status: "active" | "archived";
  }>;
  activeTasks?: number;
  score: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface WorkspaceInvite {
  _id: string;
  email: string;
  workspaceId: string;
  roleIds: WorkspaceRole[];
  token: string;
  expiresAt: string;
  accepted: boolean;
  invitedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface WorkspaceJoinRequest {
  _id: string;
  userId: UserType;
  workspaceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ModerateWorkspaceJoinRequestBody {
  workspaceId: string;
  requestId: string;
}

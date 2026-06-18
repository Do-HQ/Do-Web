"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader,
  Lock,
  MoreHorizontal,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import { AccessDenied } from "@/components/shared/access-denied";
import { LOCAL_KEYS } from "@/utils/constants";
import config from "@/config";
import {
  SECRETS_STEPUP_SESSION_KEY,
  WorkspaceProjectSecretServiceError,
} from "@/lib/services/workspace-project-secret-service";
import {
  CreateWorkspaceProjectSecretRequestBody,
  WorkspaceProjectSecretRecord,
  WorkspaceProjectSecretVisibility,
} from "@/types/project";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { OTPInput } from "@/components/shared/input/otp-input";
import { ProjectMember, ProjectTeamSummary } from "../types";
import LoaderComponent from "@/components/shared/loader";
import { useDebounce } from "@/hooks/use-debounce";
import useAuthStore from "@/stores/auth";

type SecretDraft = {
  id?: string;
  key: string;
  value: string;
  note: string;
  visibility: WorkspaceProjectSecretVisibility;
  memberIds: string[];
  teamIds: string[];
};

type ProjectSecretsTabProps = {
  workspaceId: string | null;
  projectId: string;
  members: ProjectMember[];
  teams: ProjectTeamSummary[];
};

type SecretMutationError = {
  code?: string;
  message?: string;
  description?: string;
  approvalRequest?: {
    id?: string;
    _id?: string;
  };
  response?: {
    data?: {
      code?: string;
      message?: string;
      description?: string;
      approvalRequest?: {
        id?: string;
        _id?: string;
      };
    };
  };
};

const VISIBILITY_LABELS: Record<WorkspaceProjectSecretVisibility, string> = {
  team: "Assigned team",
  restricted: "Selected members",
};

const VISIBILITY_STYLES: Record<WorkspaceProjectSecretVisibility, string> = {
  team: "border-primary/20 bg-primary/10 text-primary",
  restricted:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

const buildEmptyDraft = (
  members: ProjectMember[],
): SecretDraft => ({
  key: "",
  value: "",
  note: "",
  visibility: "restricted",
  memberIds: members.length ? [members[0].id] : [],
  teamIds: [],
});

const formatDate = (value?: string) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toDraftFromSecret = (
  secret: WorkspaceProjectSecretRecord,
): SecretDraft => {
  const visibility: WorkspaceProjectSecretVisibility =
    secret.visibility === "team" ? "team" : "restricted";
  const memberIds = Array.isArray(secret.memberIds) ? secret.memberIds : [];
  const teamIds = Array.isArray(secret.teamIds) ? secret.teamIds : [];

  return {
    id: secret.id,
    key: secret.key,
    value: "",
    note: secret.note || "",
    visibility,
    memberIds: visibility === "restricted" ? memberIds : [],
    teamIds: visibility === "team" ? teamIds : [],
  };
};

const getSecretMutationErrorMeta = (error: unknown) => {
  const normalized = (error || {}) as SecretMutationError;
  const data = normalized.response?.data;
  const code = String(data?.code || normalized.code || "").trim();
  const message = String(data?.message || normalized.message || "").trim();
  const description = String(
    data?.description || normalized.description || "",
  ).trim();
  const approvalRequest = data?.approvalRequest || normalized.approvalRequest;

  return {
    code,
    message,
    description,
    approvalRequest,
  };
};

const isApprovalRequiredMutation = (error: unknown) =>
  getSecretMutationErrorMeta(error).code === "APPROVAL_REQUIRED";

const getSecretMutationErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const { message, description } = getSecretMutationErrorMeta(error);
  return description || message || fallback;
};

const getApprovalRequestedMessage = (error: unknown, actionLabel: string) => {
  const { approvalRequest } = getSecretMutationErrorMeta(error);
  const requestId = String(
    approvalRequest?.id || approvalRequest?._id || "",
  ).trim();
  return requestId
    ? `${actionLabel} requires approval. Request #${requestId.slice(0, 8)} created.`
    : `${actionLabel} requires approval and has been sent to approvers.`;
};

export function ProjectSecretsTab({
  workspaceId,
  projectId,
  members,
  teams,
}: ProjectSecretsTabProps) {
  const { user } = useAuthStore();
  const currentUserId = user?._id;
  const currentUserEmail = user?.email ?? "";
  const queryClient = useQueryClient();
  const {
    useWorkspaceProjectSecrets,
    useWorkspaceProjectSecretsPolicy,
    useCreateWorkspaceProjectSecret,
    useUpdateWorkspaceProjectSecret,
    useDeleteWorkspaceProjectSecret,
    useRevealWorkspaceProjectSecret,
    useUpdateWorkspaceProjectSecretsPolicy,
  } = useWorkspaceProject();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<
    Record<string, string>
  >({});
  const [draft, setDraft] = useState<SecretDraft>(() => buildEmptyDraft(members));
  const [policyVisibility, setPolicyVisibility] =
    useState<WorkspaceProjectSecretVisibility>("restricted");

  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberPickerSearch, setMemberPickerSearch] = useState("");
  const [memberPickerSortAsc, setMemberPickerSortAsc] = useState(true);

  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [teamPickerSearch, setTeamPickerSearch] = useState("");
  const [teamPickerSortAsc, setTeamPickerSortAsc] = useState(true);

  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [otpStep, setOtpStep] = useState<"lock" | "requested">("lock");
  const [otpCode, setOtpCode] = useState("");
  const [otpPending, setOtpPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasToken = Boolean(sessionStorage.getItem(SECRETS_STEPUP_SESSION_KEY));
    if (hasToken) setSessionUnlocked(true);
  }, []);

  const debouncedSearch = useDebounce(search, 500);
  const queriesEnabled = Boolean(workspaceId) && Boolean(projectId) && sessionUnlocked;

  const secretsQuery = useWorkspaceProjectSecrets(
    workspaceId ?? "",
    projectId,
    {
      page,
      limit: 20,
      search: debouncedSearch,
      archived: false,
    },
    {
      enabled: queriesEnabled,
    },
  );
  const policyQuery = useWorkspaceProjectSecretsPolicy(
    workspaceId ?? "",
    projectId,
    {
      enabled: queriesEnabled,
    },
  );
  const createSecretMutation = useCreateWorkspaceProjectSecret();
  const updateSecretMutation = useUpdateWorkspaceProjectSecret();
  const deleteSecretMutation = useDeleteWorkspaceProjectSecret();
  const revealSecretMutation = useRevealWorkspaceProjectSecret();
  const updatePolicyMutation = useUpdateWorkspaceProjectSecretsPolicy();

  const secretsQueryError = secretsQuery.error;
  useEffect(() => {
    if (!sessionUnlocked) return;
    if (!(secretsQueryError instanceof WorkspaceProjectSecretServiceError)) return;

    const shouldRelock =
      secretsQueryError.status === 401 ||
      (secretsQueryError.status === 403 && secretsQueryError.code === "STEP_UP_REQUIRED");

    if (shouldRelock) {
      sessionStorage.removeItem(SECRETS_STEPUP_SESSION_KEY);
      setSessionUnlocked(false);
      setOtpStep("lock");
      setOtpCode("");
    }
  }, [secretsQueryError, sessionUnlocked]);

  const secrets = useMemo(
    () => secretsQuery.data?.secrets ?? [],
    [secretsQuery.data?.secrets],
  );
  const pagination = secretsQuery.data?.pagination;

  const invalidateSecretQueries = () => {
    if (!workspaceId) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["workspace-project-secrets", workspaceId, projectId],
    });
    queryClient.invalidateQueries({
      queryKey: ["workspace-project-secrets-policy", workspaceId, projectId],
    });
  };

  const normalizedPolicyVisibility =
    (policyQuery.data?.policy
      ?.defaultVisibility as WorkspaceProjectSecretVisibility) || "restricted";

  const openCreate = () => {
    const nextVisibility: WorkspaceProjectSecretVisibility =
      normalizedPolicyVisibility === "team" ? "team" : "restricted";
    const nextDraft = buildEmptyDraft(members);

    setDraft({
      ...nextDraft,
      visibility: nextVisibility,
      memberIds:
        nextVisibility === "restricted"
          ? nextDraft.memberIds
          : [],
      teamIds:
        nextVisibility === "team" && teams.length ? [teams[0].id] : [],
    });
    setEditorOpen(true);
  };

  const openEdit = (secret: WorkspaceProjectSecretRecord) => {
    if (
      !currentUserId ||
      String(secret.createdByUserId || "") !== String(currentUserId)
    ) {
      toast("Only the secret creator can edit this secret.");
      return;
    }
    setDraft(toDraftFromSecret(secret));
    setEditorOpen(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    setDraft((current) => {
      const exists = current.memberIds.includes(memberId);
      const nextMemberIds = exists
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId];

      return {
        ...current,
        visibility: "restricted",
        teamIds: [],
        memberIds: nextMemberIds,
      };
    });
  };

  const toggleTeamSelection = (teamId: string) => {
    setDraft((current) => {
      const exists = current.teamIds.includes(teamId);
      const nextTeamIds = exists
        ? current.teamIds.filter((id) => id !== teamId)
        : [...current.teamIds, teamId];

      return {
        ...current,
        visibility: "team",
        memberIds: [],
        teamIds: nextTeamIds,
      };
    });
  };

  const handleSave = async () => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage secrets.");
      return;
    }

    const payload: CreateWorkspaceProjectSecretRequestBody = {
      key: draft.key.trim(),
      value: draft.value.trim(),
      note: draft.note.trim(),
      visibility: draft.visibility,
      memberIds: draft.memberIds,
      teamIds: draft.teamIds,
    };

    if (!payload.key) {
      toast("Secret key is required.");
      return;
    }

    if (!draft.id && !payload.value) {
      toast("Secret value is required.");
      return;
    }

    const hasMembers = (payload.memberIds ?? []).length > 0;
    const hasTeams = (payload.teamIds ?? []).length > 0;

    if (hasMembers && hasTeams) {
      toast("Assign a secret to either teams or selected members, not both.");
      return;
    }

    if (!hasMembers && !hasTeams) {
      toast("Select at least one team or one member for this secret.");
      return;
    }

    if (payload.visibility === "team" && !hasTeams) {
      toast("Team visibility requires at least one assigned team.");
      return;
    }

    if (payload.visibility === "restricted" && !hasMembers) {
      toast("Restricted visibility requires at least one assigned member.");
      return;
    }

    if (draft.id) {
      const request = updateSecretMutation
        .mutateAsync({
          workspaceId,
          projectId,
          secretId: draft.id,
          updates: {
            key: payload.key,
            note: payload.note,
            visibility: payload.visibility,
            memberIds: payload.memberIds,
            teamIds: payload.teamIds,
            value: payload.value || undefined,
          },
        })
        .then((response) => {
          invalidateSecretQueries();
          setEditorOpen(false);
          return response;
        });

      toast.promise(request, {
        loading: "Updating secret...",
        success: "Secret updated.",
        error: (error) =>
          isApprovalRequiredMutation(error)
            ? getApprovalRequestedMessage(error, "Secret update")
            : getSecretMutationErrorMessage(error, "Unable to update secret."),
      });
      return;
    }

    const request = createSecretMutation
      .mutateAsync({
        workspaceId,
        projectId,
        payload,
      })
      .then((response) => {
        invalidateSecretQueries();
        setEditorOpen(false);
        return response;
      });

    toast.promise(request, {
      loading: "Creating secret...",
      success: "Secret created.",
      error: (error) =>
        isApprovalRequiredMutation(error)
          ? getApprovalRequestedMessage(error, "Secret creation")
          : getSecretMutationErrorMessage(error, "Unable to create secret."),
    });
  };

  const handleDelete = async (secret: WorkspaceProjectSecretRecord) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage secrets.");
      return;
    }

    const request = deleteSecretMutation
      .mutateAsync({
        workspaceId,
        projectId,
        secretId: secret.id,
      })
      .then((response) => {
        setRevealedSecrets((current) => {
          const next = { ...current };
          delete next[secret.id];
          return next;
        });
        invalidateSecretQueries();
        return response;
      });

    toast.promise(request, {
      loading: "Deleting secret...",
      success: "Secret deleted.",
      error: (error) =>
        isApprovalRequiredMutation(error)
          ? getApprovalRequestedMessage(error, "Secret deletion")
          : getSecretMutationErrorMessage(error, "Unable to delete secret."),
    });
  };

  const revealSecretValue = async (secret: WorkspaceProjectSecretRecord) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage secrets.");
      return;
    }

    if (!secret.canReveal) {
      toast("You are not allowed to reveal this secret.");
      return;
    }

    const existing = revealedSecrets[secret.id];

    if (existing) {
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[secret.id];
        return next;
      });
      return;
    }

    try {
      const response = await revealSecretMutation.mutateAsync({
        workspaceId,
        projectId,
        secretId: secret.id,
      });
      setRevealedSecrets((current) => ({
        ...current,
        [secret.id]: response.value,
      }));
    } catch (error) {
      if (isApprovalRequiredMutation(error)) {
        toast(getApprovalRequestedMessage(error, "Secret reveal"));
        return;
      }
      toast(getSecretMutationErrorMessage(error, "Unable to reveal secret."));
    }
  };

  const handleCopySecret = async (secret: WorkspaceProjectSecretRecord) => {
    const currentValue = revealedSecrets[secret.id];

    if (!currentValue) {
      toast("Reveal this secret before copying.");
      return;
    }

    try {
      await navigator.clipboard.writeText(currentValue);
      toast("Secret copied.");
    } catch {
      toast("Could not copy in this browser.");
    }
  };

  const handlePolicySave = async () => {
    if (!workspaceId) {
      toast("Open this project from a workspace to update policy.");
      return;
    }

    const request = updatePolicyMutation
      .mutateAsync({
        workspaceId,
        projectId,
        updates: {
          defaultVisibility: policyVisibility,
        },
      })
      .then((response) => {
        invalidateSecretQueries();
        setPolicyOpen(false);
        return response;
      });

    toast.promise(request, {
      loading: "Updating secret rules...",
      success: "Secret rules updated.",
      error: (error) =>
        isApprovalRequiredMutation(error)
          ? getApprovalRequestedMessage(error, "Secret rules update")
          : getSecretMutationErrorMessage(
              error,
              "Unable to update secret rules.",
            ),
    });
  };

  const openPolicy = () => {
    setPolicyVisibility(normalizedPolicyVisibility);
    setPolicyOpen(true);
  };

  const isSecretsForbidden =
    !sessionUnlocked
      ? false
      : secretsQuery.error instanceof WorkspaceProjectSecretServiceError &&
        secretsQuery.error.status === 403 &&
        secretsQuery.error.code !== "STEP_UP_REQUIRED";

  if (isSecretsForbidden) {
    return (
      <AccessDenied
        compact
        title="No access to secrets"
        description="You don't have permission to view secrets for this project."
      />
    );
  }

  const buildStepUpHeaders = () => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem(LOCAL_KEYS.TOKEN) ?? ""
      : "";
    return {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  };

  const baseApiUrl = String(config.BASE_API_URL || "").trim().replace(/\/+$/, "");

  const handleSendOtp = () => {
    setOtpPending(true);
    const request = fetch(`${baseApiUrl}/auth/step-up/start`, {
      method: "POST",
      headers: buildStepUpHeaders(),
      body: JSON.stringify({ email: currentUserEmail }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          String((data as { description?: string }).description || "Failed to send code.")
        );
      }
      setOtpStep("requested");
    }).finally(() => setOtpPending(false));

    void toast.promise(request, {
      loading: "Sending verification code…",
      success: `Code sent to ${currentUserEmail}`,
      error: (err: unknown) =>
        err instanceof Error ? err.message : "Failed to send code.",
    });
  };

  const handleVerifyOtp = (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (!code) return;
    setOtpPending(true);
    const request = fetch(`${baseApiUrl}/auth/step-up/verify`, {
      method: "POST",
      headers: buildStepUpHeaders(),
      body: JSON.stringify({ email: currentUserEmail, code }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          String((data as { description?: string }).description || "Invalid code.")
        );
      }
      const stepUpToken = String((data as { stepUpToken?: string }).stepUpToken || "").trim();
      if (!stepUpToken) throw new Error("Verification failed. Try again.");
      sessionStorage.setItem(SECRETS_STEPUP_SESSION_KEY, stepUpToken);
      setSessionUnlocked(true);
    }).finally(() => setOtpPending(false));

    void toast.promise(request, {
      loading: "Verifying…",
      success: "Identity verified",
      error: (err: unknown) =>
        err instanceof Error ? err.message : "Verification failed.",
    });
  };

  if (!sessionUnlocked) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-6 rounded-xl border border-border/35 bg-card/75 p-8 shadow-xs">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border/40 bg-muted/50">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          {otpStep === "lock" ? (
            <>
              <div>
                <p className="text-[14px] font-semibold">Verify your identity</p>
                <p className="text-muted-foreground mt-1 text-[12px] leading-5">
                  Secrets are protected. Send a one-time code to{" "}
                  <span className="text-foreground font-medium">{currentUserEmail}</span>{" "}
                  to continue.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSendOtp}
                disabled={otpPending}
              >
                Send verification code
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-[14px] font-semibold">Enter verification code</p>
                <p className="text-muted-foreground mt-1 text-[12px] leading-5">
                  We sent a 6-digit code to{" "}
                  <span className="text-foreground font-medium">{currentUserEmail}</span>.
                </p>
              </div>
              <div className="flex w-full flex-col items-center gap-3">
                <OTPInput
                  count={6}
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6) handleVerifyOtp(val);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full max-w-xs"
                  onClick={() => handleVerifyOtp()}
                  disabled={otpPending || otpCode.length < 6}
                >
                  Verify
                </Button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-[12px] underline-offset-2 hover:underline"
                  onClick={() => {
                    setOtpCode("");
                    setOtpStep("lock");
                  }}
                >
                  Use a different code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <section
        data-tour="project-secrets-shell"
        className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs"
      >
        <div
          data-tour="project-secrets-controls"
          className="flex flex-col gap-3 border-b border-border/20 px-3 py-3 md:px-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[14px] font-semibold md:text-[15px]">
                Secrets
              </div>
              <div className="text-muted-foreground text-[12px] leading-5">
                Secrets are encrypted end-to-end for transport, encrypted at
                rest, and scoped to either teams or selected members.
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search secrets"
                className="h-8 w-full sm:w-56"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openPolicy}
                >
                  <PencilLine />
                  Edit rules
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCreate}
                >
                  <Plus />
                  Create secret
                </Button>
              </div>
            </div>
          </div>
        </div>

        {secretsQuery.isLoading ? (
          <LoaderComponent />
        ) : secrets.length ? (
          <>
            <div data-tour="project-secrets-list" className="divide-y divide-border/20 lg:hidden">
              {secrets.map((secret) => {
                const assignedMembers = members.filter((member) =>
                  secret.memberIds.includes(member.id),
                );
                const visibleValue = revealedSecrets[secret.id];
                const canManageSecret =
                  !!currentUserId &&
                  String(secret.createdByUserId || "") === String(currentUserId);

                return (
                  <div key={secret.id} className="px-3 py-3 md:px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="truncate text-[13px] font-medium">
                            {secret.key}
                          </div>
                          <Badge
                            variant="outline"
                            className={VISIBILITY_STYLES[secret.visibility]}
                          >
                            {VISIBILITY_LABELS[secret.visibility]}
                          </Badge>
                        </div>
                        <div className="font-mono text-[12px] tracking-[0.15em] text-muted-foreground">
                          {visibleValue || secret.valueMasked}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!secret.canReveal}
                            onClick={() => revealSecretValue(secret)}
                          >
                            {revealSecretMutation?.isPending ? (
                              <Loader size={10} className="animate-spin" />
                            ) : visibleValue ? (
                              <EyeOff />
                            ) : (
                              <Eye />
                            )}
                            {visibleValue ? "Hide" : "Show"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySecret(secret)}
                          >
                            <Copy />
                            Copy
                          </Button>
                        </div>
                        <AvatarGroup>
                          {assignedMembers.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              size="sm"
                              userCard={{
                                name: member.name,
                                role: member.role,
                                team:
                                  member.teamIds.length > 1
                                    ? `${member.teamIds.length} teams`
                                    : member.teamIds.length === 1
                                    ? "1 team"
                                    : "No team",
                                status: member.active ? "Active" : "Offline",
                                details: [
                                  {
                                    label: "Score",
                                    value: `${Number(member.score || 0)} pts`,
                                  },
                                ],
                              }}
                            >
                              <AvatarImage
                                src={member.avatarUrl || ""}
                                alt={member.name}
                              />
                              <AvatarFallback>{member.initials}</AvatarFallback>
                            </Avatar>
                          ))}
                          {assignedMembers.length > 3 ? (
                            <AvatarGroupCount className="text-[11px]">
                              +{assignedMembers.length - 3}
                            </AvatarGroupCount>
                          ) : null}
                        </AvatarGroup>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManageSecret ? (
                            <DropdownMenuItem onClick={() => openEdit(secret)}>
                              Edit secret
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            disabled={!secret.canReveal}
                            onClick={() => revealSecretValue(secret)}
                          >
                            {visibleValue ? "Hide value" : "Show value"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopySecret(secret)}
                          >
                            Copy value
                          </DropdownMenuItem>
                          {canManageSecret ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDelete(secret)}
                              >
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>

            <div data-tour="project-secrets-list" className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Secret key</TableHead>
                    <TableHead>Date added</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead>Members assigned</TableHead>
                    <TableHead className="w-10 text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secrets.map((secret) => {
                    const assignedMembers = members.filter((member) =>
                      secret.memberIds.includes(member.id),
                    );
                    const visibleValue = revealedSecrets[secret.id];
                    const canManageSecret =
                      !!currentUserId &&
                      String(secret.createdByUserId || "") === String(currentUserId);

                    return (
                      <TableRow
                        key={secret.id}
                        className="h-11 bg-background/40 [&>td]:py-2"
                      >
                        <TableCell>
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-medium md:text-[13px]">
                              {secret.key}
                            </div>
                            {secret.note ? (
                              <div className="text-muted-foreground line-clamp-1 text-[11px]">
                                {secret.note}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(secret.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] tracking-[0.15em] text-muted-foreground">
                              {visibleValue || secret.valueMasked}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleCopySecret(secret)}
                            >
                              <Copy />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!secret.canReveal}
                              onClick={() => revealSecretValue(secret)}
                            >
                              {revealSecretMutation?.isPending ? (
                                <Loader size={10} className="animate-spin" />
                              ) : visibleValue ? (
                                <EyeOff />
                              ) : (
                                <Eye />
                              )}
                              {visibleValue ? "Hide" : "Show"}
                            </Button>
                            <Badge
                              variant="outline"
                              className={VISIBILITY_STYLES[secret.visibility]}
                            >
                              {VISIBILITY_LABELS[secret.visibility]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AvatarGroup>
                            {assignedMembers.slice(0, 3).map((member) => (
                              <Avatar
                                key={member.id}
                                size="sm"
                                userCard={{
                                  name: member.name,
                                  role: member.role,
                                  team:
                                    member.teamIds.length > 1
                                      ? `${member.teamIds.length} teams`
                                      : member.teamIds.length === 1
                                      ? "1 team"
                                      : "No team",
                                  status: member.active ? "Active" : "Offline",
                                  details: [
                                    {
                                      label: "Score",
                                      value: `${Number(member.score || 0)} pts`,
                                    },
                                  ],
                                }}
                              >
                                <AvatarImage
                                  src={member.avatarUrl || ""}
                                  alt={member.name}
                                />
                                <AvatarFallback>
                                  {member.initials}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {assignedMembers.length > 3 ? (
                              <AvatarGroupCount className="text-[11px]">
                                +{assignedMembers.length - 3}
                              </AvatarGroupCount>
                            ) : null}
                          </AvatarGroup>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManageSecret ? (
                                <DropdownMenuItem
                                  onClick={() => openEdit(secret)}
                                >
                                  Edit secret
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                disabled={!secret.canReveal}
                                onClick={() => revealSecretValue(secret)}
                              >
                                {visibleValue ? "Hide value" : "Show value"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCopySecret(secret)}
                              >
                                Copy value
                              </DropdownMenuItem>
                              {canManageSecret ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleDelete(secret)}
                                  >
                                    <Trash2 />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {pagination ? (
              <div className="flex items-center justify-between border-t border-border/20 px-3 py-2.5 text-[11px] md:px-4">
                <div className="text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-4 py-4">
            <Empty className="border-0 p-0 md:p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyDescription className="text-[12px] leading-5">
                  No secrets match the current search.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit" : "Create"} secret</DialogTitle>
            <DialogDescription>
              Scope each secret to either one or more teams, or to selected
              members only.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="secret-key">Secret key</Label>
              <Input
                id="secret-key"
                value={draft.key}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    key: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secret-value">
                Value {draft.id ? "(leave blank to keep current value)" : ""}
              </Label>
              <Input
                id="secret-value"
                value={draft.value}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Visibility</Label>
              <Select
                value={draft.visibility}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    visibility: value as WorkspaceProjectSecretVisibility,
                    memberIds:
                      value === "restricted" ? current.memberIds : [],
                    teamIds: value === "team" ? current.teamIds : [],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Assigned team</SelectItem>
                  <SelectItem value="restricted">Selected members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Assigned teams</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.visibility !== "team"}
                onClick={() => {
                  setTeamPickerSearch("");
                  setTeamPickerSortAsc(true);
                  setTeamPickerOpen(true);
                }}
                className="h-9 w-full justify-between px-3"
              >
                <span className="flex items-center gap-2 text-[12px]">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {draft.teamIds.length === 0
                    ? "Choose teams…"
                    : `${draft.teamIds.length} team${draft.teamIds.length === 1 ? "" : "s"} selected`}
                </span>
                {draft.teamIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {teams
                      .filter((t) => draft.teamIds.includes(t.id))
                      .slice(0, 3)
                      .map((t) => (
                        <span
                          key={t.id}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          {t.name}
                        </span>
                      ))}
                    {draft.teamIds.length > 3 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                        +{draft.teamIds.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Assigned members</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.visibility !== "restricted"}
                onClick={() => {
                  setMemberPickerSearch("");
                  setMemberPickerSortAsc(true);
                  setMemberPickerOpen(true);
                }}
                className="h-9 w-full justify-between px-3"
              >
                <span className="flex items-center gap-2 text-[12px]">
                  <Users className="size-3.5 text-muted-foreground" />
                  {draft.memberIds.length === 0
                    ? "Choose members…"
                    : `${draft.memberIds.length} member${draft.memberIds.length === 1 ? "" : "s"} selected`}
                </span>
                {draft.memberIds.length > 0 && (
                  <AvatarGroup>
                    {members
                      .filter((m) => draft.memberIds.includes(m.id))
                      .slice(0, 4)
                      .map((m) => (
                        <Avatar key={m.id} size="sm">
                          <AvatarImage src={m.avatarUrl || ""} alt={m.name} />
                          <AvatarFallback>{m.initials}</AvatarFallback>
                        </Avatar>
                      ))}
                    {draft.memberIds.length > 4 && (
                      <AvatarGroupCount className="text-[11px]">
                        +{draft.memberIds.length - 4}
                      </AvatarGroupCount>
                    )}
                  </AvatarGroup>
                )}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secret-note">Usage note</Label>
              <Textarea
                id="secret-note"
                value={draft.note}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                className="min-h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                createSecretMutation.isPending || updateSecretMutation.isPending
              }
            >
              {draft.id ? "Save changes" : "Create secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign members</DialogTitle>
            <DialogDescription>
              Select the members who should have access to this secret.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search members…"
                value={memberPickerSearch}
                onChange={(e) => setMemberPickerSearch(e.target.value)}
                className="h-8 pr-8 text-[12px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setMemberPickerSortAsc((v) => !v)}
              title={memberPickerSortAsc ? "Sort Z → A" : "Sort A → Z"}
            >
              {memberPickerSortAsc ? (
                <ArrowDownAZ className="size-3.5" />
              ) : (
                <ArrowUpAZ className="size-3.5" />
              )}
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/35">
            {(() => {
              const filtered = members
                .filter((m) =>
                  m.name.toLowerCase().includes(memberPickerSearch.toLowerCase()) ||
                  m.role.toLowerCase().includes(memberPickerSearch.toLowerCase()),
                )
                .sort((a, b) =>
                  memberPickerSortAsc
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name),
                );

              if (!filtered.length) {
                return (
                  <div className="flex flex-col items-center gap-1 py-8 text-center">
                    <p className="text-[12px] text-muted-foreground">No members match your search.</p>
                  </div>
                );
              }

              return filtered.map((member, idx) => {
                const selected = draft.memberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMemberSelection(member.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${idx !== 0 ? "border-t border-border/25" : ""} ${selected ? "bg-muted/30" : ""}`}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={member.avatarUrl || ""} alt={member.name} />
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{member.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{member.role}</p>
                    </div>
                    <div className={`flex size-4 items-center justify-center rounded-sm border transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border/50"}`}>
                      {selected && <Check className="size-3" />}
                    </div>
                  </button>
                );
              });
            })()}
          </div>

          <DialogFooter>
            <span className="mr-auto text-[11px] text-muted-foreground">
              {draft.memberIds.length} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft((c) => ({ ...c, memberIds: [] }))}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setMemberPickerOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamPickerOpen} onOpenChange={setTeamPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign teams</DialogTitle>
            <DialogDescription>
              Select the teams that should have access to this secret.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search teams…"
                value={teamPickerSearch}
                onChange={(e) => setTeamPickerSearch(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setTeamPickerSortAsc((v) => !v)}
              title={teamPickerSortAsc ? "Sort Z → A" : "Sort A → Z"}
            >
              {teamPickerSortAsc ? (
                <ArrowDownAZ className="size-3.5" />
              ) : (
                <ArrowUpAZ className="size-3.5" />
              )}
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/35">
            {(() => {
              const filtered = teams
                .filter((t) =>
                  t.name.toLowerCase().includes(teamPickerSearch.toLowerCase()) ||
                  t.focus.toLowerCase().includes(teamPickerSearch.toLowerCase()),
                )
                .sort((a, b) =>
                  teamPickerSortAsc
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name),
                );

              if (!filtered.length) {
                return (
                  <div className="flex flex-col items-center gap-1 py-8 text-center">
                    <p className="text-[12px] text-muted-foreground">No teams match your search.</p>
                  </div>
                );
              }

              return filtered.map((team, idx) => {
                const selected = draft.teamIds.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeamSelection(team.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${idx !== 0 ? "border-t border-border/25" : ""} ${selected ? "bg-muted/30" : ""}`}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/50">
                      <Building2 className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{team.name}</p>
                      {team.focus && (
                        <p className="truncate text-[11px] text-muted-foreground">{team.focus}</p>
                      )}
                    </div>
                    <div className={`flex size-4 items-center justify-center rounded-sm border transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border/50"}`}>
                      {selected && <Check className="size-3" />}
                    </div>
                  </button>
                );
              });
            })()}
          </div>

          <DialogFooter>
            <span className="mr-auto text-[11px] text-muted-foreground">
              {draft.teamIds.length} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft((c) => ({ ...c, teamIds: [] }))}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setTeamPickerOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Secret visibility rules</DialogTitle>
            <DialogDescription>
              Set the default visibility that is applied when a new secret is
              created in this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-xl border border-border/20 bg-background/70 p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <ShieldCheck className="size-4 text-primary" />
                </span>
                <div className="space-y-2">
                  <div className="text-[13px] font-medium">
                    Default secret policy
                  </div>
                  <div className="text-muted-foreground text-[12px] leading-5">
                    Choose whether new secrets default to team-scoped or
                    member-scoped access.
                  </div>
                  <Select
                    value={policyVisibility}
                    onValueChange={(value) =>
                      setPolicyVisibility(
                        value as WorkspaceProjectSecretVisibility,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Assigned team</SelectItem>
                      <SelectItem value="restricted">
                        Selected members
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPolicyOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePolicySave}
              disabled={updatePolicyMutation.isPending}
            >
              Save policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

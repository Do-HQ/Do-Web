"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Loader,
  MoreHorizontal,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import {
  CreateWorkspaceProjectSecretRequestBody,
  WorkspaceProjectSecretRecord,
  WorkspaceProjectSecretVisibility,
} from "@/types/project";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function ProjectSecretsTab({
  workspaceId,
  projectId,
  members,
  teams,
}: ProjectSecretsTabProps) {
  const currentUserId = useAuthStore((state) => state.user?._id);
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

  const debouncedSearch = useDebounce(search, 500);

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
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );
  const policyQuery = useWorkspaceProjectSecretsPolicy(
    workspaceId ?? "",
    projectId,
    {
      enabled: Boolean(workspaceId) && Boolean(projectId),
    },
  );
  const createSecretMutation = useCreateWorkspaceProjectSecret();
  const updateSecretMutation = useUpdateWorkspaceProjectSecret();
  const deleteSecretMutation = useDeleteWorkspaceProjectSecret();
  const revealSecretMutation = useRevealWorkspaceProjectSecret();
  const updatePolicyMutation = useUpdateWorkspaceProjectSecretsPolicy();

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

  const handleSave = () => {
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
      updateSecretMutation.mutate(
        {
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
        },
        {
          onSuccess: () => {
            invalidateSecretQueries();
            setEditorOpen(false);
            toast("Secret updated.");
          },
        },
      );
      return;
    }

    createSecretMutation.mutate(
      {
        workspaceId,
        projectId,
        payload,
      },
      {
        onSuccess: () => {
          invalidateSecretQueries();
          setEditorOpen(false);
          toast("Secret created.");
        },
      },
    );
  };

  const handleDelete = (secret: WorkspaceProjectSecretRecord) => {
    if (!workspaceId) {
      toast("Open this project from a workspace to manage secrets.");
      return;
    }

    deleteSecretMutation.mutate(
      {
        workspaceId,
        projectId,
        secretId: secret.id,
      },
      {
        onSuccess: () => {
          setRevealedSecrets((current) => {
            const next = { ...current };
            delete next[secret.id];
            return next;
          });
          invalidateSecretQueries();
          toast("Secret deleted.");
        },
      },
    );
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

    revealSecretMutation.mutate(
      {
        workspaceId,
        projectId,
        secretId: secret.id,
      },
      {
        onSuccess: (response) => {
          setRevealedSecrets((current) => ({
            ...current,
            [secret.id]: response.value,
          }));
        },
      },
    );
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

  const handlePolicySave = () => {
    if (!workspaceId) {
      toast("Open this project from a workspace to update policy.");
      return;
    }

    updatePolicyMutation.mutate(
      {
        workspaceId,
        projectId,
        updates: {
          defaultVisibility: policyVisibility,
        },
      },
      {
        onSuccess: () => {
          invalidateSecretQueries();
          setPolicyOpen(false);
          toast("Secret policy updated.");
        },
      },
    );
  };

  const openPolicy = () => {
    setPolicyVisibility(normalizedPolicyVisibility);
    setPolicyOpen(true);
  };

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/35 bg-card/75 shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/20 px-3 py-3 md:px-4">
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
            <div className="divide-y divide-border/20 lg:hidden">
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
                              }}
                            >
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

            <div className="hidden overflow-x-auto lg:block">
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
                                }}
                              >
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
          <div className="text-muted-foreground px-4 py-4 text-[12px] leading-5">
            No secrets match the current search.
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
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/35 bg-background/70 p-2">
                {teams.length ? (
                  teams.map((team) => {
                    const selected = draft.teamIds.includes(team.id);

                    return (
                      <Button
                        key={team.id}
                        type="button"
                        variant={selected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleTeamSelection(team.id)}
                        className="h-7 px-2 text-[11px]"
                        disabled={draft.visibility !== "team"}
                      >
                        {team.name}
                      </Button>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-[11px]">
                    No teams assigned to this project yet.
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Assigned members</Label>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border/35 bg-background/70 p-2">
                {members.length ? (
                  members.map((member) => {
                    const selected = draft.memberIds.includes(member.id);

                    return (
                      <Button
                        key={member.id}
                        type="button"
                        variant={selected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleMemberSelection(member.id)}
                        className="h-7 px-2 text-[11px]"
                        disabled={draft.visibility !== "restricted"}
                      >
                        {member.name}
                      </Button>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground text-[11px]">
                    No members assigned to this project yet.
                  </span>
                )}
              </div>
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

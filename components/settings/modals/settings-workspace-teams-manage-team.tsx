"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/shared/input";
import {
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import useWorkspace from "@/hooks/use-workspace";
import SettingsWorkspaceTeamsAddMemberModal, {
  TeamMemberInviteValue,
} from "./settings-workspace-teams-add-member";
import { TeamMemberRole, TeamVisibility } from "@/types/team";
import LoaderComponent from "@/components/shared/loader";

type TeamIdentityTab = "general" | "members" | "security";

type GeneralFormState = {
  name: string;
  key: string;
  leadUserId: string;
  visibility: TeamVisibility;
  description: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  initialTab?: TeamIdentityTab;
  openMemberPickerOnMount?: boolean;
}

const toKey = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 12);
};

const emptyGeneralState: GeneralFormState = {
  name: "",
  key: "",
  leadUserId: "",
  visibility: "open",
  description: "",
};

const SettingsWorkspaceTeamsManageTeamModal = ({
  open,
  onOpenChange,
  teamId,
  initialTab = "general",
  openMemberPickerOnMount = false,
}: Props) => {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspacePeople } = useWorkspace();
  const {
    useWorkspaceTeamDetail,
    useUpdateWorkspaceTeam,
    useAddWorkspaceTeamMembers,
    useUpdateWorkspaceTeamMember,
    useRemoveWorkspaceTeamMember,
    useArchiveWorkspaceTeam,
    useDissolveWorkspaceTeam,
  } = useWorkspaceTeam();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TeamIdentityTab>(initialTab);
  const [memberSearch, setMemberSearch] = useState("");
  const [generalForm, setGeneralForm] =
    useState<GeneralFormState>(emptyGeneralState);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  useEffect(() => {
    if (open && openMemberPickerOnMount && activeTab === "members") {
      setShowAddMemberModal(true);
    }
  }, [activeTab, open, openMemberPickerOnMount]);

  const detailQuery = useWorkspaceTeamDetail(workspaceId!, teamId || "", {
    page: 1,
    limit: 100,
    search: memberSearch,
  });
  const workspacePeopleQuery = useWorkspacePeople(workspaceId!, {
    page: 1,
    limit: 500,
    search: "",
  });

  useEffect(() => {
    if (!open || !workspaceId) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["get-workspaces-people", workspaceId],
    });
  }, [open, queryClient, workspaceId]);

  const team = detailQuery.data?.data?.team;
  const members = useMemo(
    () => detailQuery.data?.data?.members || [],
    [detailQuery.data],
  );
  const workspaceMembers = useMemo(() => {
    const seen = new Set<string>();

    return (workspacePeopleQuery.data?.data?.members || []).filter((member) => {
      const user =
        member && typeof member.userId === "object" && member.userId
          ? member.userId
          : null;
      const id = String(user?._id || "");

      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
  }, [workspacePeopleQuery.data]);

  useEffect(() => {
    if (!team) {
      return;
    }

    setGeneralForm({
      name: team.name,
      key: team.key,
      leadUserId:
        typeof team.leadUserId === "string"
          ? team.leadUserId
          : team.leadUser?._id || "",
      visibility: team.visibility,
      description: team.description || "",
    });
  }, [team]);

  const leadOptions = useMemo(() => {
    return workspaceMembers.map((member) => {
      const user = member.userId;
      const label =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        [
          (user as { firstname?: string } | undefined)?.firstname,
          (user as { lastnale?: string } | undefined)?.lastnale,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        user?.email;
      return {
        label,
        value: String(user?._id || ""),
      };
    });
  }, [workspaceMembers]);

  const existingTeamKeys = useMemo(() => {
    return [team?.key].filter(Boolean) as string[];
  }, [team?.key]);

  const keyTaken = useMemo(() => {
    const normalizedKey = toKey(generalForm.key);
    return existingTeamKeys.some(
      (key) =>
        key.toUpperCase() === normalizedKey.toUpperCase() && key !== team?.key,
    );
  }, [existingTeamKeys, generalForm.key, team?.key]);

  const existingMemberIds = useMemo(() => {
    return members.map((member) => String(member.userId?._id || ""));
  }, [members]);

  const invalidateTeamQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["workspace-teams", workspaceId],
    });
    if (teamId) {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team-detail", workspaceId, teamId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-team-members", workspaceId, teamId],
      });
    }
  };

  const { isPending: isSavingGeneral, mutateAsync: saveGeneral } =
    useUpdateWorkspaceTeam({
      onSuccess() {
        invalidateTeamQueries();
      },
    });

  const { isPending: isAddingMembers, mutateAsync: addMembers } =
    useAddWorkspaceTeamMembers({
      onSuccess() {
        invalidateTeamQueries();
      },
    });

  const { mutateAsync: updateMemberRole } = useUpdateWorkspaceTeamMember({
    onSuccess() {
      invalidateTeamQueries();
    },
  });

  const { mutateAsync: removeMember } = useRemoveWorkspaceTeamMember({
    onSuccess() {
      invalidateTeamQueries();
    },
  });

  const { isPending: isArchiving, mutateAsync: archiveTeam } =
    useArchiveWorkspaceTeam({
      onSuccess() {
        invalidateTeamQueries();
        onOpenChange(false);
      },
    });

  const { isPending: isDissolving, mutateAsync: dissolveTeam } =
    useDissolveWorkspaceTeam({
      onSuccess() {
        invalidateTeamQueries();
        onOpenChange(false);
      },
    });

  const handleSaveGeneral = async () => {
    if (!workspaceId || !teamId || !team || keyTaken) {
      return;
    }

    await toast.promise(
      saveGeneral({
        workspaceId,
        teamId,
        updates: {
          name: generalForm.name.trim(),
          key: toKey(generalForm.key),
          leadUserId: generalForm.leadUserId || null,
          visibility: generalForm.visibility,
          description: generalForm.description.trim(),
        },
      }),
      {
        loading: "Saving team changes...",
        success: (data) => data?.data?.message || "Team updated",
        error: "Could not update team",
      },
    );
  };

  const handleAddMembers = async (payload: TeamMemberInviteValue) => {
    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(
      addMembers({
        workspaceId,
        teamId,
        payload,
      }),
      {
        loading: "Adding members...",
        success: (data) => data?.data?.message || "Members added",
        error: "Could not add members",
      },
    );
  };

  const handleRoleChange = async (memberId: string, role: TeamMemberRole) => {
    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(
      updateMemberRole({
        workspaceId,
        teamId,
        memberId,
        payload: { role },
      }),
      {
        loading: "Updating member role...",
        success: (data) => data?.data?.message || "Member role updated",
        error: "Could not update member role",
      },
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(
      removeMember({
        workspaceId,
        teamId,
        memberId,
      }),
      {
        loading: "Removing member...",
        success: (data) => data?.data?.message || "Member removed",
        error: "Could not remove member",
      },
    );
  };

  const handleArchive = async () => {
    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(archiveTeam({ workspaceId, teamId }), {
      loading: "Archiving team...",
      success: (data) => data?.data?.message || "Team archived",
      error: "Could not archive team",
    });
  };

  const handleDissolve = async () => {
    if (!workspaceId || !teamId) {
      return;
    }

    await toast.promise(dissolveTeam({ workspaceId, teamId }), {
      loading: "Dissolving team...",
      success: (data) => data?.data?.message || "Team dissolved",
      error: "Could not dissolve team",
    });
  };

  const isLeadMember = (memberUserId: string) => {
    return Boolean(
      team?.leadUser && String(team.leadUser._id) === memberUserId,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{team?.name || "Manage team"}</DialogTitle>
          <DialogDescription>
            {team?.memberCount || 0} member(s) ·{" "}
            {team?.visibility === "private" ? "Private" : "Open in workspace"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TeamIdentityTab)}
        >
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <FieldSet>
              <FieldGroup className="gap-4">
                <Input
                  label="Team name"
                  value={generalForm.name}
                  onChange={(event) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />

                <Input
                  label="Team key"
                  value={generalForm.key}
                  onChange={(event) =>
                    setGeneralForm((prev) => ({
                      ...prev,
                      key: toKey(event.target.value),
                    }))
                  }
                />
                {keyTaken && (
                  <FieldDescription className="text-destructive -mt-2">
                    Another team already uses this key.
                  </FieldDescription>
                )}

                <div className="flex flex-col gap-2">
                  <FieldLabel>Team lead</FieldLabel>
                  <Select
                    value={generalForm.leadUserId}
                    onValueChange={(value) =>
                      setGeneralForm((prev) => ({ ...prev, leadUserId: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadOptions.map((lead) => (
                        <SelectItem key={lead.value} value={lead.value}>
                          {lead.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Visibility</FieldLabel>
                  <Select
                    value={generalForm.visibility}
                    onValueChange={(value) =>
                      setGeneralForm((prev) => ({
                        ...prev,
                        visibility: value as TeamVisibility,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open in workspace</SelectItem>
                      <SelectItem value="private">Private team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={generalForm.description}
                    placeholder="Describe the team focus and ownership..."
                    onChange={(event) =>
                      setGeneralForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </FieldGroup>

              <div className="flex items-center gap-2 pt-3">
                <Button
                  size="sm"
                  loading={isSavingGeneral}
                  onClick={handleSaveGeneral}
                >
                  Save changes
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </FieldSet>
          </TabsContent>

          <TabsContent value="members">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search team members"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["get-workspaces-people", workspaceId],
                    });
                    setShowAddMemberModal(true);
                  }}
                >
                  Add members
                </Button>
              </div>

              <div className="rounded-md border">
                <div className="grid grid-cols-[minmax(0,1fr)_12rem_5rem] gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Name</span>
                  <span>Role</span>
                  <span></span>
                </div>
                <div className="divide-y">
                  {members.length ? (
                    members.map((member) => {
                      const user = member.userId;
                      const fullName =
                        [user?.firstName, user?.lastName]
                          .filter(Boolean)
                          .join(" ")
                          .trim() || user?.email;
                      const memberIsLead = isLeadMember(String(user?._id));

                      return (
                        <div
                          key={member._id}
                          className="grid grid-cols-[minmax(0,1fr)_12rem_5rem] items-center gap-3 px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              size="sm"
                              userCard={{
                                name: fullName,
                                email: user?.email,
                                role:
                                  member.role === "lead"
                                    ? "Team lead"
                                    : member.role,
                                team: team?.name,
                                status:
                                  member.role === "lead"
                                    ? "Primary lead"
                                    : "Active member",
                              }}
                            >
                              <AvatarFallback>
                                {fullName
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((chunk) => chunk[0]?.toUpperCase())
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">
                                  {fullName}
                                </p>
                                {memberIsLead ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    Team lead
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-muted-foreground truncate text-xs">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(
                                member._id,
                                value as TeamMemberRole,
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="observer">Observer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={memberIsLead}
                            onClick={() => handleRemoveMember(member._id)}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-muted-foreground px-3 py-8 text-sm text-center">
                      {detailQuery.isLoading ? (
                        <LoaderComponent />
                      ) : (
                        "No members found for this team."
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-4">
              <div className="rounded-md border px-4 py-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Visibility
                    </p>
                    <p className="font-medium">
                      {team?.visibility === "private"
                        ? "Private"
                        : "Open in workspace"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Status
                    </p>
                    <p className="font-medium capitalize">
                      {team?.status || "active"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Multi-team membership
                    </p>
                    <p className="font-medium">
                      {detailQuery.data?.data?.team
                        ? "Controlled by workspace policy"
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Lead requirement
                    </p>
                    <p className="font-medium">
                      Controlled by workspace policy
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={isArchiving}
                  onClick={handleArchive}
                >
                  Archive team
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  loading={isDissolving}
                  onClick={handleDissolve}
                >
                  Dissolve team
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <SettingsWorkspaceTeamsAddMemberModal
          open={showAddMemberModal}
          onOpenChange={setShowAddMemberModal}
          teamName={team?.name}
          existingMemberIds={existingMemberIds}
          loading={isAddingMembers || workspacePeopleQuery.isFetching}
          onSubmit={handleAddMembers}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SettingsWorkspaceTeamsManageTeamModal;

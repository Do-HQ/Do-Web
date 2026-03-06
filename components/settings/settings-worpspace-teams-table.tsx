"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  CircleOff,
  Ellipsis,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  UserPlus2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import SettingsWorkspaceTeamsAddTeamModal from "./modals/settings-workspace-teams-add-team";
import SettingsWorkspaceTeamsManageTeamModal from "./modals/settings-workspace-teams-manage-team";
import SettingsWorkspaceTeamsConfirmActionModal from "./modals/settings-workspace-teams-confirm-action";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import useWorkspace from "@/hooks/use-workspace";
import { CreateWorkspaceTeamRequestBody, WorkspaceTeam } from "@/types/team";
import { useDebounce } from "@/hooks/use-debounce";
import LoaderComponent from "../shared/loader";

type ConfirmAction = "archive" | "restore" | "dissolve" | null;

type ManageTab = "general" | "members" | "security";

export function WorkspaceTeamsTable() {
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspacePeople } = useWorkspace();
  const {
    useWorkspaceTeams,
    useCreateWorkspaceTeam,
    useArchiveWorkspaceTeam,
    useUnarchiveWorkspaceTeam,
    useDissolveWorkspaceTeam,
  } = useWorkspaceTeam();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState<"active" | "archived">("active");
  const [sortLeadAsc, setSortLeadAsc] = React.useState(true);

  const [showAddTeamModal, setShowAddTeamModal] = React.useState(false);
  const [showManageTeamModal, setShowManageTeamModal] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [manageInitialTab, setManageInitialTab] = React.useState<ManageTab>("general");
  const [openMemberPickerOnMount, setOpenMemberPickerOnMount] =
    React.useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const teamsQuery = useWorkspaceTeams(workspaceId!, {
    page,
    limit: 10,
    search: debouncedSearch,
    status,
  });
  const peopleQuery = useWorkspacePeople(workspaceId!, {
    page: 1,
    limit: 100,
    search: "",
  });

  const teams = React.useMemo(() => {
    const rows = teamsQuery.data?.data?.teams || [];
    return [...rows].sort((a, b) => {
      const aLead =
        `${a.leadUser?.firstName || ""} ${a.leadUser?.lastName || ""}`.trim();
      const bLead =
        `${b.leadUser?.firstName || ""} ${b.leadUser?.lastName || ""}`.trim();
      return sortLeadAsc
        ? aLead.localeCompare(bLead)
        : bLead.localeCompare(aLead);
    });
  }, [sortLeadAsc, teamsQuery.data]);

  const selectedTeam = React.useMemo<WorkspaceTeam | null>(() => {
    return teams.find((team) => team._id === selectedTeamId) || null;
  }, [selectedTeamId, teams]);

  const leadOptions = React.useMemo(() => {
    return (peopleQuery.data?.data?.members || []).map((member) => {
      const user = member.userId;
      return {
        value: String(user?._id || ""),
        label:
          [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
          user?.email,
      };
    });
  }, [peopleQuery.data]);

  const existingTeamKeys = React.useMemo(() => {
    return teams.map((team) => team.key);
  }, [teams]);

  const invalidateTeams = React.useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["workspace-teams", workspaceId],
    });
    if (selectedTeamId) {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team-detail", workspaceId, selectedTeamId],
      });
    }
  }, [queryClient, selectedTeamId, workspaceId]);

  const { isPending: isCreatingTeam, mutateAsync: createTeam } =
    useCreateWorkspaceTeam({
      onSuccess() {
        invalidateTeams();
      },
    });

  const { mutateAsync: archiveTeam } =
    useArchiveWorkspaceTeam({
      onSuccess() {
        invalidateTeams();
        setConfirmAction(null);
      },
    });

  const { mutateAsync: unarchiveTeam } =
    useUnarchiveWorkspaceTeam({
      onSuccess() {
        invalidateTeams();
        setConfirmAction(null);
      },
    });

  const { mutateAsync: dissolveTeam } =
    useDissolveWorkspaceTeam({
      onSuccess() {
        invalidateTeams();
        setConfirmAction(null);
      },
    });

  const handleCreateTeam = async (payload: CreateWorkspaceTeamRequestBody) => {
    if (!workspaceId) {
      return;
    }

    await toast.promise(
      createTeam({
        workspaceId,
        payload,
      }),
      {
        loading: "Creating team...",
        success: (data) => data?.data?.message || "Team created",
        error: "Could not create team",
      },
    );
  };

  const handleArchiveTeam = async () => {
    if (!workspaceId || !selectedTeamId) {
      return;
    }

    await toast.promise(
      archiveTeam({
        workspaceId,
        teamId: selectedTeamId,
      }),
      {
        loading: "Archiving team...",
        success: (data) => data?.data?.message || "Team archived",
        error: "Could not archive team",
      },
    );
  };

  const handleRestoreTeam = async () => {
    if (!workspaceId || !selectedTeamId) {
      return;
    }

    await toast.promise(
      unarchiveTeam({
        workspaceId,
        teamId: selectedTeamId,
      }),
      {
        loading: "Restoring team...",
        success: (data) => data?.data?.message || "Team restored",
        error: "Could not restore team",
      },
    );
  };

  const handleDissolveTeam = async () => {
    if (!workspaceId || !selectedTeamId) {
      return;
    }

    await toast.promise(
      dissolveTeam({
        workspaceId,
        teamId: selectedTeamId,
      }),
      {
        loading: "Dissolving team...",
        success: (data) => data?.data?.message || "Team dissolved",
        error: "Could not dissolve team",
      },
    );
  };

  const openActionModal = (
    action: "add-member" | "manage" | "archive" | "restore" | "dissolve",
    team: WorkspaceTeam,
  ) => {
    setSelectedTeamId(team._id);

    if (action === "add-member") {
      setManageInitialTab("members");
      setOpenMemberPickerOnMount(false);
      setShowManageTeamModal(true);
      return;
    }

    if (action === "manage") {
      setManageInitialTab("general");
      setOpenMemberPickerOnMount(false);
      setShowManageTeamModal(true);
      return;
    }

    if (action === "archive" || action === "restore" || action === "dissolve") {
      setConfirmAction(action);
    }
  };

  const pagination = teamsQuery.data?.data?.pagination;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Filter by team name..."
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="max-w-sm"
        />

        <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1">
          <Button
            type="button"
            size="sm"
            variant={status === "active" ? "secondary" : "ghost"}
            className="h-8 px-3"
            onClick={() => {
              setPage(1);
              setStatus("active");
            }}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={status === "archived" ? "secondary" : "ghost"}
            className="h-8 px-3"
            onClick={() => {
              setPage(1);
              setStatus("archived");
            }}
          >
            Archived
          </Button>
        </div>

        <Button className="sm:ml-auto" onClick={() => setShowAddTeamModal(true)}>
          <Plus />
          New team
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground h-11 px-3 text-xs font-medium">
                Team
              </TableHead>
              <TableHead className="text-muted-foreground h-11 px-3 text-xs font-medium">
                <Button
                  variant="ghost"
                  className="h-auto w-auto px-0 py-0"
                  size="sm"
                  onClick={() => setSortLeadAsc((prev) => !prev)}
                >
                  Lead
                  <ArrowUpDown />
                </Button>
              </TableHead>
              <TableHead className="text-muted-foreground h-11 px-3 text-xs font-medium">
                Workload
              </TableHead>
              <TableHead className="text-muted-foreground h-11 px-3 text-xs font-medium text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {teamsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24">
                  <div className="flex items-center justify-center">
                    <LoaderComponent />
                  </div>
                </TableCell>
              </TableRow>
            ) : teams.length ? (
              teams.map((team) => {
                const leadName =
                  [team.leadUser?.firstName, team.leadUser?.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || "No lead assigned";

                return (
                  <TableRow key={team._id}>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-col gap-1 py-0.5">
                        <div className="font-medium leading-none">{team.name}</div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span className="uppercase">{team.key}</span>
                          <Badge
                            variant={
                              team.visibility === "private" ? "secondary" : "outline"
                            }
                            className="h-5 px-2 text-[10px]"
                          >
                            {team.visibility === "private" ? "Private" : "Open"}
                          </Badge>
                          {team.status === "archived" ? (
                            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                              Archived
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          size="sm"
                          userCard={{
                            name: leadName,
                            email: team.leadUser?.email,
                            role: "Team lead",
                            team: team.name,
                            status:
                              team.status === "archived" ? "Archived team" : "Active team",
                          }}
                        >
                          <AvatarFallback>
                            {leadName
                              .split(" ")
                              .slice(0, 2)
                              .map((chunk) => chunk[0]?.toUpperCase())
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{leadName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium">{team.memberCount} members</span>
                        <span className="text-muted-foreground">
                          {team.activeProjectsCount} projects
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            {team.status === "active" ? (
                              <DropdownMenuItem onClick={() => openActionModal("add-member", team)}>
                                <UserPlus2 />
                                Add member
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => openActionModal("manage", team)}>
                              <Settings2 />
                              Manage team
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            {team.status === "active" ? (
                              <DropdownMenuItem onClick={() => openActionModal("archive", team)}>
                                <CircleOff />
                                Archive {team.name}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openActionModal("restore", team)}>
                                <RotateCcw />
                                Restore {team.name}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openActionModal("dissolve", team)}
                            >
                              <Trash2 />
                              Dissolve {team.name}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No {status} teams found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground py-4 text-sm">
        {pagination?.total || 0} team(s)
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={!pagination?.hasPrevPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!pagination?.hasNextPage}
        >
          Next
        </Button>
      </div>

      <SettingsWorkspaceTeamsAddTeamModal
        open={showAddTeamModal}
        onOpenChange={setShowAddTeamModal}
        existingTeamKeys={existingTeamKeys}
        leadOptions={leadOptions}
        loading={isCreatingTeam}
        onCreateTeam={handleCreateTeam}
      />

      <SettingsWorkspaceTeamsManageTeamModal
        open={showManageTeamModal}
        onOpenChange={(nextOpen) => {
          setShowManageTeamModal(nextOpen);
          if (!nextOpen) {
            setOpenMemberPickerOnMount(false);
          }
        }}
        teamId={selectedTeamId}
        initialTab={manageInitialTab}
        openMemberPickerOnMount={openMemberPickerOnMount}
      />

      <SettingsWorkspaceTeamsConfirmActionModal
        open={confirmAction === "archive"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConfirmAction(null);
          }
        }}
        action="archive"
        teamName={selectedTeam?.name}
        teamKey={selectedTeam?.key}
        onConfirm={handleArchiveTeam}
      />

      <SettingsWorkspaceTeamsConfirmActionModal
        open={confirmAction === "restore"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConfirmAction(null);
          }
        }}
        action="restore"
        teamName={selectedTeam?.name}
        teamKey={selectedTeam?.key}
        onConfirm={handleRestoreTeam}
      />

      <SettingsWorkspaceTeamsConfirmActionModal
        open={confirmAction === "dissolve"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConfirmAction(null);
          }
        }}
        action="dissolve"
        teamName={selectedTeam?.name}
        teamKey={selectedTeam?.key}
        onConfirm={handleDissolveTeam}
      />
    </div>
  );
}

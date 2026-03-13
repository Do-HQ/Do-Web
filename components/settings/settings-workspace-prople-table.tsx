import React, { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown01,
  ArrowUpDown,
  Check,
  ChevronDown,
  Ellipsis,
  Mail,
  SearchX,
  Settings2,
  ShieldUser,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Input } from "../shared/input";
import { Label } from "../ui/label";
import LoaderComponent from "../shared/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useDebounce } from "@/hooks/use-debounce";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import { returnFullName } from "@/lib/helpers/return-full-name";
import { getWorkspaceTeamMembers } from "@/lib/services/workspace-team-service";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceRole } from "@/types/workspace";
import { PAGE_LIMIT } from "@/utils/constants";

type UserTeam = {
  id: string;
  name: string;
  status: "active" | "archived";
};

interface User {
  workspaceMemberId: string;
  userId: string;
  name: string;
  email: string;
  teams: string;
  teamsData: UserTeam[];
  roleLabel: string;
  role: WorkspaceRole[];
  profileImage: string;
  activeTasks: number;
  score: number;
}

type RowActionHandlers = {
  canManage: boolean;
  onViewDetails: (user: User) => void;
  onMakeTeamLead: (user: User) => void;
  onSwitchTeams: (user: User) => void;
  onDisableAccount: (user: User) => void;
};

const getColumns = ({
  canManage,
  onViewDetails,
  onMakeTeamLead,
  onSwitchTeams,
  onDisableAccount,
}: RowActionHandlers): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Person",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="capitalize">
          <div className="flex items-center gap-2">
            <Avatar
              size="sm"
              userCard={{
                name: user.name,
                email: user.email,
                role: user.roleLabel,
                team: user.teams,
              }}
            >
              <AvatarImage src={user.profileImage} alt={user.name} />
              <AvatarFallback>
                {String(user.name || "")
                  .trim()
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{user.name}</div>
              <div className="text-muted-foreground truncate text-[11px]">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "teams",
    header: ({ column }) => {
      return (
        <Button
          className="h-auto w-fit px-0 py-0"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          size="sm"
        >
          Teams
          <ArrowUpDown className="size-3.5" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left text-[12px]">{row.getValue("teams")}</div>
    ),
  },
  {
    accessorKey: "role",
    header: () => <div className="text-left">Role</div>,
    cell: ({ row }) => {
      const roles: WorkspaceRole[] = row.getValue("role");

      return (
        <div className="flex items-center gap-1">
          {roles?.map((role) => (
            <Badge className="capitalize text-center" variant="secondary" key={role?._id}>
              {role?.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "activeTasks",
    header: () => <div className="text-left">Active Tasks</div>,
    cell: ({ row }) => (
      <div className="text-left font-medium">{row.getValue("activeTasks")}</div>
    ),
  },
  {
    accessorKey: "score",
    header: () => <div className="text-left">Score</div>,
    cell: ({ row }) => {
      const score = Number(row.getValue("score") || 0);
      return (
        <div className="text-left text-sm font-medium">
          {Number.isFinite(score) ? score : 0} pts
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onViewDetails(user)}>
                <UserRoundSearch className="size-3.5" />
                View Person Details
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => onMakeTeamLead(user)}
                disabled={
                  !canManage ||
                  !user.teamsData.some((team) => team.status === "active")
                }
              >
                <ShieldUser className="size-3.5" />
                Make Team lead
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSwitchTeams(user)}
                disabled={!canManage}
              >
                <Settings2 className="size-3.5" />
                Switch Teams
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDisableAccount(user)}
                disabled={!canManage}
              >
                <Trash2 className="size-3.5" />
                Disable account
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const SettingsWorkspacePeopleTable = () => {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedTeamFilterId, setSelectedTeamFilterId] = useState("all");

  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [leadTargetUser, setLeadTargetUser] = useState<User | null>(null);
  const [leadTargetTeamId, setLeadTargetTeamId] = useState("");
  const [switchTargetUser, setSwitchTargetUser] = useState<User | null>(null);
  const [switchSelectedTeamIds, setSwitchSelectedTeamIds] = useState<string[]>(
    [],
  );
  const [disableTargetUser, setDisableTargetUser] = useState<User | null>(null);

  const { workspaceId } = useWorkspaceStore();
  const { isAdminLike } = useWorkspacePermissions();
  const debouncedSearch = useDebounce(search, 500);

  const workspaceHook = useWorkspace();
  const teamHook = useWorkspaceTeam();

  const { useWorkspacePeople, useRemoveWorkspaceMember } = workspaceHook;
  const { useWorkspaceTeams, useAddWorkspaceTeamMembers, useRemoveWorkspaceTeamMember, useUpdateWorkspaceTeamMember } =
    teamHook;

  const { isPending: isLoadingWorkspacePeople, data: workspacePeopleData } =
    useWorkspacePeople(workspaceId!, {
      page,
      search: debouncedSearch!,
      limit: PAGE_LIMIT,
    });

  const { data: activeTeamsData } = useWorkspaceTeams(
    workspaceId!,
    {
      page: 1,
      limit: 200,
      search: "",
      status: "active",
    },
  );

  const removeWorkspaceMemberMutation = useRemoveWorkspaceMember();
  const addWorkspaceTeamMembersMutation = useAddWorkspaceTeamMembers();
  const removeWorkspaceTeamMemberMutation = useRemoveWorkspaceTeamMember();
  const updateWorkspaceTeamMemberMutation = useUpdateWorkspaceTeamMember();

  const activeTeams = useMemo(
    () => activeTeamsData?.data?.teams ?? [],
    [activeTeamsData],
  );

  const selectedTeamFilterLabel = useMemo(() => {
    if (selectedTeamFilterId === "all") {
      return "All teams";
    }

    const matchedTeam = activeTeams.find(
      (team) => String(team?._id || "") === selectedTeamFilterId,
    );
    return matchedTeam?.name || "All teams";
  }, [activeTeams, selectedTeamFilterId]);

  const workspacePeople: User[] = useMemo(() => {
    const members = workspacePeopleData?.data?.members ?? [];

    return members.map((member) => {
      const teamsData: UserTeam[] = (member?.teams ?? [])
        .map((team) => ({
          id: String(team?._id || ""),
          name: String(team?.name || ""),
          status: team?.status === "archived" ? "archived" : "active",
        }))
        .filter((team) => Boolean(team.id && team.name));

      return {
        workspaceMemberId: String(member?._id || ""),
        userId: String(member?.userId?._id || ""),
        name: returnFullName(member?.userId) || "No name",
        email: String(member?.userId?.email || ""),
        profileImage: String(member?.userId?.profilePhoto?.url || ""),
        teamsData,
        teams:
          teamsData
            .filter((team) => team.status === "active")
            .map((team) => team.name)
            .join(", ") || "No team",
        roleLabel:
          member?.roles
            ?.map((role) => role?.name)
            .filter(Boolean)
            .join(", ") || "Workspace member",
        role: member?.roles || [],
        activeTasks: 0,
        score: Number(member?.score || 0),
      };
    });
  }, [workspacePeopleData]);

  const filteredWorkspacePeople = useMemo(() => {
    if (selectedTeamFilterId === "all") {
      return workspacePeople;
    }

    return workspacePeople.filter((user) =>
      user.teamsData.some((team) => team.id === selectedTeamFilterId),
    );
  }, [workspacePeople, selectedTeamFilterId]);

  const invalidatePeopleAndTeams = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["get-workspaces-people", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-teams", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-team-members", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-team-detail", workspaceId],
      }),
    ]);
  }, [queryClient, workspaceId]);

  const handlePageUpdate = (
    isAllowed: boolean,
    mode: "increase" | "decrease",
  ) => {
    if (!isAllowed) {
      return;
    }

    if (mode === "decrease") {
      setPage((prev) => Math.max(1, prev - 1));
      return;
    }

    setPage((prev) => prev + 1);
  };

  const openLeadDialog = (user: User) => {
    const firstActiveTeam = user.teamsData.find(
      (team) => team.status === "active",
    );
    setLeadTargetUser(user);
    setLeadTargetTeamId(String(firstActiveTeam?.id || ""));
  };

  const openSwitchDialog = (user: User) => {
    setSwitchTargetUser(user);
    setSwitchSelectedTeamIds(
      user.teamsData
        .filter((team) => team.status === "active")
        .map((team) => team.id),
    );
  };

  const handleMakeLead = async () => {
    if (!workspaceId || !leadTargetUser?.userId || !leadTargetTeamId) {
      return;
    }

    await toast.promise(
      (async () => {
        const teamMembersResponse = await getWorkspaceTeamMembers(
          workspaceId,
          leadTargetTeamId,
          { page: 1, limit: 200, search: "" },
        );

        const teamMember = (teamMembersResponse?.data?.members || []).find(
          (member) =>
            String(member?.userId?._id || "") === String(leadTargetUser.userId),
        );

        if (!teamMember?._id) {
          throw new Error(
            `${leadTargetUser.name} is not currently in that team. Add them first.`,
          );
        }

        await updateWorkspaceTeamMemberMutation.mutateAsync({
          workspaceId,
          teamId: leadTargetTeamId,
          memberId: String(teamMember._id),
          payload: {
            role: "lead",
          },
        });

        await invalidatePeopleAndTeams();
      })(),
      {
        loading: "Updating team lead...",
        success: "Team lead updated.",
        error: (error) =>
          error instanceof Error ? error.message : "Could not update team lead.",
      },
    );

    setLeadTargetUser(null);
    setLeadTargetTeamId("");
  };

  const handleSwitchTeams = async () => {
    if (!workspaceId || !switchTargetUser?.userId) {
      return;
    }

    const currentTeamIds = new Set(
      switchTargetUser.teamsData
        .filter((team) => team.status === "active")
        .map((team) => team.id),
    );
    const nextTeamIds = new Set(switchSelectedTeamIds);

    const teamIdsToAdd = Array.from(nextTeamIds).filter(
      (teamId) => !currentTeamIds.has(teamId),
    );
    const teamIdsToRemove = Array.from(currentTeamIds).filter(
      (teamId) => !nextTeamIds.has(teamId),
    );

    if (!teamIdsToAdd.length && !teamIdsToRemove.length) {
      toast.info("No team changes detected.");
      return;
    }

    await toast.promise(
      (async () => {
        for (const teamId of teamIdsToAdd) {
          await addWorkspaceTeamMembersMutation.mutateAsync({
            workspaceId,
            teamId,
            payload: {
              members: [
                {
                  userId: switchTargetUser.userId,
                  role: "member",
                },
              ],
            },
          });
        }

        for (const teamId of teamIdsToRemove) {
          const teamMembersResponse = await getWorkspaceTeamMembers(
            workspaceId,
            teamId,
            { page: 1, limit: 200, search: "" },
          );
          const targetTeamMember = (teamMembersResponse?.data?.members || []).find(
            (member) =>
              String(member?.userId?._id || "") === String(switchTargetUser.userId),
          );

          if (!targetTeamMember?._id) {
            continue;
          }

          await removeWorkspaceTeamMemberMutation.mutateAsync({
            workspaceId,
            teamId,
            memberId: String(targetTeamMember._id),
          });
        }

        await invalidatePeopleAndTeams();
      })(),
      {
        loading: "Switching teams...",
        success: "Team assignment updated.",
        error: (error) =>
          error instanceof Error
            ? error.message
            : "Could not update team assignment.",
      },
    );

    setSwitchTargetUser(null);
    setSwitchSelectedTeamIds([]);
  };

  const handleDisableAccount = async () => {
    if (!workspaceId || !disableTargetUser?.workspaceMemberId) {
      return;
    }

    await toast.promise(
      removeWorkspaceMemberMutation.mutateAsync({
        workspaceId,
        memberId: disableTargetUser.workspaceMemberId,
      }),
      {
        loading: "Disabling account...",
        success: "Workspace member removed.",
        error: "Could not disable account.",
      },
    );

    await invalidatePeopleAndTeams();
    setDisableTargetUser(null);
  };

  const columns = useMemo(
    () =>
      getColumns({
        canManage: isAdminLike,
        onViewDetails: setDetailsUser,
        onMakeTeamLead: openLeadDialog,
        onSwitchTeams: openSwitchDialog,
        onDisableAccount: setDisableTargetUser,
      }),
    [isAdminLike],
  );

  const table = useReactTable({
    data: filteredWorkspacePeople,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const pagination = workspacePeopleData?.data?.pagination;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          placeholder="Search by user name or team..."
          value={search}
          onChange={(event) => setSearch(event?.target?.value)}
          className="max-w-sm"
          type="search"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ArrowDown01 className="size-3.5" /> {selectedTeamFilterLabel}{" "}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuCheckboxItem
                checked={selectedTeamFilterId === "all"}
                onCheckedChange={() => setSelectedTeamFilterId("all")}
              >
                All teams
              </DropdownMenuCheckboxItem>
              {activeTeams.map((team) => (
                <DropdownMenuCheckboxItem
                  key={team._id}
                  checked={selectedTeamFilterId === team._id}
                  onCheckedChange={() => setSelectedTeamFilterId(team._id)}
                >
                  {team.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-md border">
        {isLoadingWorkspacePeople ? (
          <LoaderComponent />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                    className="h-24"
                  >
                    <Empty className="border-0 p-0 md:p-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="size-8">
                          <SearchX className="size-3.5 text-primary/85" />
                        </EmptyMedia>
                        <EmptyDescription className="text-[12px]">
                          No results.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {Number(pagination?.total || 0) > PAGE_LIMIT ? (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex items-center gap-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlePageUpdate(Boolean(pagination?.hasPrevPage), "decrease");
              }}
              disabled={!pagination?.hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlePageUpdate(Boolean(pagination?.hasNextPage), "increase");
              }}
              disabled={!pagination?.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(detailsUser)}
        onOpenChange={(open) => !open && setDetailsUser(null)}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          {detailsUser ? (
            <>
              <div className="border-b bg-muted/35 px-5 py-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-[15px]">Person details</DialogTitle>
                  <DialogDescription className="text-[12px]">
                    Workspace member profile and assignment summary.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    size="default"
                    userCard={{
                      name: detailsUser.name,
                      email: detailsUser.email,
                      role: detailsUser.roleLabel,
                      team: detailsUser.teams,
                    }}
                  >
                    <AvatarImage src={detailsUser.profileImage} alt={detailsUser.name} />
                    <AvatarFallback>
                      {detailsUser.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold">
                      {detailsUser.name}
                    </div>
                    <div className="text-muted-foreground truncate text-[12px]">
                      {detailsUser.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="text-muted-foreground text-[11px]">Score</div>
                    <div className="text-[13px] font-semibold">{detailsUser.score} pts</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="text-muted-foreground text-[11px]">Active tasks</div>
                    <div className="text-[13px] font-semibold">{detailsUser.activeTasks}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="text-muted-foreground text-[11px]">Teams</div>
                    <div className="text-[13px] font-semibold">
                      {detailsUser.teamsData.length}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-background/70 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium">
                    <ShieldUser className="size-3.5 text-muted-foreground" />
                    Roles
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {detailsUser.role.length ? (
                      detailsUser.role.map((role) => (
                        <Badge
                          variant="secondary"
                          key={role?._id}
                          className="capitalize text-[11px]"
                        >
                          {role?.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-[11px]">
                        No roles assigned.
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-background/70 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium">
                    <Settings2 className="size-3.5 text-muted-foreground" />
                    Team assignments
                  </div>
                  {detailsUser.teamsData.length ? (
                    <div className="space-y-1.5">
                      {detailsUser.teamsData.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between rounded-md bg-muted/35 px-2.5 py-1.5 text-[12px]"
                        >
                          <span className="truncate">{team.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {team.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      No active team assignments.
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium">Quick action</div>
                    <div className="text-muted-foreground truncate text-[11px]">
                      Contact this member directly.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (!detailsUser.email) {
                        return;
                      }
                      window.open(`mailto:${detailsUser.email}`, "_blank");
                    }}
                  >
                    <Mail className="size-3.5" />
                    Send email
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(leadTargetUser)}
        onOpenChange={(open) => {
          if (!open) {
            setLeadTargetUser(null);
            setLeadTargetTeamId("");
          }
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make team lead</DialogTitle>
            <DialogDescription>
              Assign {leadTargetUser?.name || "this member"} as the lead for one team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select value={leadTargetTeamId} onValueChange={setLeadTargetTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {(leadTargetUser?.teamsData || [])
                    .filter((team) => team.status === "active")
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={
                  !leadTargetTeamId ||
                  updateWorkspaceTeamMemberMutation.isPending
                }
                onClick={() => void handleMakeLead()}
              >
                <ShieldUser className="size-3.5" />
                Update lead
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLeadTargetUser(null);
                  setLeadTargetTeamId("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(switchTargetUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSwitchTargetUser(null);
            setSwitchSelectedTeamIds([]);
          }
        }}
      >
        <DialogContent className="p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch teams</DialogTitle>
            <DialogDescription>
              Add or remove {switchTargetUser?.name || "this member"} from active teams.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
              {activeTeams.length ? (
                activeTeams.map((team) => {
                  const checked = switchSelectedTeamIds.includes(
                    String(team._id || ""),
                  );

                  return (
                    <label
                      key={team._id}
                      className="hover:bg-muted/40 flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium">
                          {team.name}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {team.memberCount} members
                        </div>
                      </div>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          const teamId = String(team._id || "");
                          setSwitchSelectedTeamIds((prev) => {
                            if (!nextChecked) {
                              return prev.filter((entry) => entry !== teamId);
                            }
                            if (prev.includes(teamId)) {
                              return prev;
                            }
                            return [...prev, teamId];
                          });
                        }}
                      />
                    </label>
                  );
                })
              ) : (
                <div className="text-muted-foreground px-2 py-1 text-[12px]">
                  No active teams available in this workspace.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={
                  addWorkspaceTeamMembersMutation.isPending ||
                  removeWorkspaceTeamMemberMutation.isPending
                }
                onClick={() => void handleSwitchTeams()}
              >
                <Check className="size-3.5" />
                Save assignment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSwitchTargetUser(null);
                  setSwitchSelectedTeamIds([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(disableTargetUser)}
        onOpenChange={(open) => {
          if (!open) {
            setDisableTargetUser(null);
          }
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable account</DialogTitle>
            <DialogDescription>
              Remove {disableTargetUser?.name || "this member"} from the workspace and all team assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={removeWorkspaceMemberMutation.isPending}
              onClick={() => void handleDisableAccount()}
            >
              <Trash2 className="size-3.5" />
              Disable account
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDisableTargetUser(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsWorkspacePeopleTable;

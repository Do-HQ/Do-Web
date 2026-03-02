"use client";

import * as React from "react";
import { toast } from "sonner";
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
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  CircleOff,
  Ellipsis,
  Plus,
  Settings2,
  Trash2,
  UserPlus2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import SettingsWorkspaceTeamsAddTeamModal, {
  CreateTeamFormValue,
} from "./modals/settings-workspace-teams-add-team";
import SettingsWorkspaceTeamsAddMemberModal, {
  TeamMemberInviteValue,
} from "./modals/settings-workspace-teams-add-member";
import SettingsWorkspaceTeamsManageTeamModal, {
  ManageTeamValue,
} from "./modals/settings-workspace-teams-manage-team";
import SettingsWorkspaceTeamsConfirmActionModal from "./modals/settings-workspace-teams-confirm-action";

export type TeamTableRecord = {
  id: string;
  name: string;
  key: string;
  lead: string;
  members: number;
  activeProjects: number;
  visibility: "open" | "private";
  description?: string;
  updatedAt: string;
};

const INITIAL_TEAMS: TeamTableRecord[] = [
  {
    id: "tm_1",
    name: "Frontend Devs",
    key: "FE",
    lead: "Ezimorah Tobenna",
    members: 7,
    activeProjects: 3,
    visibility: "open",
    description: "Owns workspace web surfaces and shared UI components.",
    updatedAt: "2026-02-17T10:30:00.000Z",
  },
  {
    id: "tm_2",
    name: "Product Owners",
    key: "PO",
    lead: "Ohani Kizito",
    members: 4,
    activeProjects: 5,
    visibility: "open",
    description: "Drives roadmap, requirements, and release priorities.",
    updatedAt: "2026-02-16T14:20:00.000Z",
  },
  {
    id: "tm_3",
    name: "Designers",
    key: "DSN",
    lead: "Test User 1",
    members: 5,
    activeProjects: 4,
    visibility: "private",
    description: "Maintains UX systems and execution-ready design specs.",
    updatedAt: "2026-02-14T08:42:00.000Z",
  },
  {
    id: "tm_4",
    name: "Testers",
    key: "QA",
    lead: "Jeff Bezos",
    members: 6,
    activeProjects: 2,
    visibility: "open",
    description: "Owns quality gates and release confidence checks.",
    updatedAt: "2026-02-15T09:15:00.000Z",
  },
  {
    id: "tm_5",
    name: "Solution Architects",
    key: "ARCH",
    lead: "Nwabufo Chinenye",
    members: 3,
    activeProjects: 2,
    visibility: "private",
    description: "Defines service boundaries and system-level architecture.",
    updatedAt: "2026-02-13T07:50:00.000Z",
  },
];

export function WorkspaceTeamsTable() {
  const [teams, setTeams] = React.useState<TeamTableRecord[]>(INITIAL_TEAMS);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [showAddTeamModal, setShowAddTeamModal] = React.useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = React.useState(false);
  const [showManageTeamModal, setShowManageTeamModal] = React.useState(false);
  const [showArchiveTeamModal, setShowArchiveTeamModal] = React.useState(false);
  const [showDissolveTeamModal, setShowDissolveTeamModal] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<TeamTableRecord | null>(
    null,
  );

  const leadOptions = React.useMemo(() => {
    const leads = Array.from(new Set(teams.map((team) => team.lead).filter(Boolean)));
    return leads.sort();
  }, [teams]);

  const existingTeamKeys = React.useMemo(() => {
    return teams.map((team) => team.key);
  }, [teams]);

  const handleCreateTeam = (payload: CreateTeamFormValue) => {
    const nextTeam: TeamTableRecord = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `team_${Date.now()}`,
      name: payload.teamName,
      key: payload.teamKey,
      lead: payload.teamLead,
      members: 1,
      activeProjects: 0,
      visibility: payload.visibility,
      description: payload.description,
      updatedAt: new Date().toISOString(),
    };

    setTeams((prev) => [nextTeam, ...prev]);
  };

  const handleAddMember = (payload: TeamMemberInviteValue) => {
    if (!selectedTeam) {
      return;
    }

    setTeams((prev) =>
      prev.map((team) =>
        team.id === selectedTeam.id
          ? {
              ...team,
              members: team.members + 1,
              updatedAt: new Date().toISOString(),
            }
          : team,
      ),
    );

    toast.success("Member added", {
      description: `${payload.email} added to ${selectedTeam.name}.`,
    });
  };

  const handleSaveManagedTeam = (payload: ManageTeamValue) => {
    if (!selectedTeam) {
      return;
    }

    setTeams((prev) =>
      prev.map((team) =>
        team.id === selectedTeam.id
          ? {
              ...team,
              name: payload.name,
              key: payload.key,
              lead: payload.lead,
              visibility: payload.visibility,
              description: payload.description,
              updatedAt: new Date().toISOString(),
            }
          : team,
      ),
    );

    toast.success("Team updated", {
      description: `${payload.name} details were updated successfully.`,
    });
  };

  const handleArchiveTeam = () => {
    if (!selectedTeam) {
      return;
    }

    setTeams((prev) => prev.filter((team) => team.id !== selectedTeam.id));
    toast.success("Team archived", {
      description: `${selectedTeam.name} was removed from active teams.`,
    });
  };

  const handleDissolveTeam = () => {
    if (!selectedTeam) {
      return;
    }

    setTeams((prev) => prev.filter((team) => team.id !== selectedTeam.id));
    toast.success("Team dissolved", {
      description: `${selectedTeam.name} has been dissolved.`,
    });
  };

  const openActionModal = (
    action: "add-member" | "manage" | "archive" | "dissolve",
    team: TeamTableRecord,
  ) => {
    setSelectedTeam(team);

    if (action === "add-member") {
      setShowAddMemberModal(true);
    }

    if (action === "manage") {
      setShowManageTeamModal(true);
    }

    if (action === "archive") {
      setShowArchiveTeamModal(true);
    }

    if (action === "dissolve") {
      setShowDissolveTeamModal(true);
    }
  };

  const columns = React.useMemo<ColumnDef<TeamTableRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Team",
        cell: ({ row }) => {
          const team = row.original;

          return (
            <div className="flex flex-col gap-1 py-0.5">
              <div className="font-medium leading-none">{team.name}</div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="uppercase">{team.key}</span>
                <Badge
                  variant={team.visibility === "private" ? "secondary" : "outline"}
                  className="h-5 px-2 text-[10px]"
                >
                  {team.visibility === "private" ? "Private" : "Open"}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "lead",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              className="h-auto w-auto px-0 py-0"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Lead
              <ArrowUpDown />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>
                {String(row.getValue("lead"))
                  .split(" ")
                  .slice(0, 2)
                  .map((chunk) => chunk[0]?.toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.getValue("lead")}</span>
          </div>
        ),
      },
      {
        id: "workload",
        header: "Workload",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{row.original.members} members</span>
              <span className="text-muted-foreground">
                {row.original.activeProjects} projects
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const team = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => openActionModal("add-member", team)}>
                    <UserPlus2 />
                    Add member
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openActionModal("manage", team)}>
                    <Settings2 />
                    Manage team
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => openActionModal("archive", team)}>
                    <CircleOff />
                    Archive {team.name}
                  </DropdownMenuItem>
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
          );
        },
      },
    ],
    [],
  );

  // TanStack table intentionally manages mutable state internally.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: teams,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 py-4">
        <Input
          placeholder="Filter by team name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        <Button className="ml-auto" onClick={() => setShowAddTeamModal(true)}>
          <Plus />
          New team
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground h-11 px-3 text-xs font-medium"
                  >
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No teams found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground py-4 text-sm">
        {table.getFilteredRowModel().rows.length} team(s)
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <SettingsWorkspaceTeamsAddTeamModal
        open={showAddTeamModal}
        onOpenChange={setShowAddTeamModal}
        existingTeamKeys={existingTeamKeys}
        leadOptions={leadOptions}
        onCreateTeam={handleCreateTeam}
      />

      <SettingsWorkspaceTeamsAddMemberModal
        open={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
        teamName={selectedTeam?.name}
        onSubmit={handleAddMember}
      />

      <SettingsWorkspaceTeamsManageTeamModal
        key={selectedTeam?.id ?? "manage-team-modal"}
        open={showManageTeamModal}
        onOpenChange={setShowManageTeamModal}
        team={selectedTeam}
        leadOptions={leadOptions}
        existingTeamKeys={existingTeamKeys}
        onSubmit={handleSaveManagedTeam}
      />

      <SettingsWorkspaceTeamsConfirmActionModal
        open={showArchiveTeamModal}
        onOpenChange={setShowArchiveTeamModal}
        action="archive"
        teamName={selectedTeam?.name}
        teamKey={selectedTeam?.key}
        onConfirm={handleArchiveTeam}
      />

      <SettingsWorkspaceTeamsConfirmActionModal
        open={showDissolveTeamModal}
        onOpenChange={setShowDissolveTeamModal}
        action="dissolve"
        teamName={selectedTeam?.name}
        teamKey={selectedTeam?.key}
        onConfirm={handleDissolveTeam}
      />
    </div>
  );
}

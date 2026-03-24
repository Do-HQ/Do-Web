import React, { useCallback, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  ArrowUpDown,
  CircleOff,
  Ellipsis,
  RefreshCcw,
  SearchX,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Input } from "../shared/input";
import { cn } from "@/lib/utils";
import SettingsWorkspacePeopleAddMembers from "./modals/settings-workspace-people-add-member";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useDebounce } from "@/hooks/use-debounce";
import { PAGE_LIMIT } from "@/utils/constants";
import { WorkspaceInvite, WorkspaceRole } from "@/types/workspace";
import dayJs from "@/lib/helpers/dayJs";
import LoaderComponent from "../shared/loader";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type InviteActionHandlers = {
  canManageInvites: boolean;
  isActionPending: boolean;
  onResend: (invite: WorkspaceInvite) => void;
  onRevoke: (invite: WorkspaceInvite) => void;
};

const getStatusLabel = (invite: WorkspaceInvite) => {
  if (invite?.accepted) {
    return "accepted";
  }

  const expiryTime = new Date(invite?.expiresAt || "").getTime();
  if (Number.isFinite(expiryTime) && expiryTime <= Date.now()) {
    return "expired";
  }

  return "pending";
};

const getColumns = ({
  canManageInvites,
  isActionPending,
  onResend,
  onRevoke,
}: InviteActionHandlers): ColumnDef<WorkspaceInvite>[] => [
  {
    accessorKey: "email",
    header: "Email address",
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div className="flex items-center justify-center">
          <Button
            className="h-auto w-auto"
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            size="sm"
          >
            Date created
            <ArrowUpDown />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="text-center">
        {dayJs(row.getValue("createdAt")).format("Do MMMM, YYYY")}
      </div>
    ),
  },
  {
    accessorKey: "roleIds",
    header: () => <div className="text-center">Role(s)</div>,
    cell: ({ row }) => {
      const roles: WorkspaceRole[] = row?.getValue("roleIds");
      return (
        <div className="flex items-center gap-1 justify-center">
          {roles?.map((r) => {
            return (
              <div className="flex justify-center" key={r?._id}>
                <Badge className="capitalize text-center" variant="secondary">
                  {r?.name}
                </Badge>
              </div>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "accepted",
    header: () => <div className="text-left">Status</div>,
    cell: ({ row }) => {
      const invite = row.original;
      const status = getStatusLabel(invite);

      return (
        <Badge
          className={cn(
            "capitalize",
            status === "accepted" && "bg-green-700/30 text-green-400",
            status === "pending" && "bg-yellow-700/30 text-yellow-400",
            status === "expired" && "bg-zinc-700/30 text-zinc-400",
          )}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const invite = row.original;
      const status = getStatusLabel(invite);
      const disableResend = !canManageInvites || status === "accepted" || isActionPending;
      const disableRevoke = !canManageInvites || status !== "pending" || isActionPending;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canManageInvites || isActionPending}
              title={
                !canManageInvites
                  ? "Only workspace owners/admins can manage invites."
                  : undefined
              }
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={disableResend}
                onClick={() => onResend(invite)}
              >
                <RefreshCcw />
                Resend Invite
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                disabled={disableRevoke}
                onClick={() => onRevoke(invite)}
              >
                <CircleOff />
                Revoke invite
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const SettingsWorkspacePropleInvitesTable = () => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  // Utils
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();

  // Helpers
  const handlPageUpdate = (
    isAllowed: boolean,
    mode: "increase" | "decrease",
  ) => {
    if (!isAllowed) {
      return;
    }
    if (mode === "decrease") {
      setPage((prev) => prev - 1);
    }
    if (mode === "increase") {
      setPage((prev) => prev + 1);
    }
  };

  // Stores
  const { workspaceId } = useWorkspaceStore();
  const { canInviteWorkspaceMembers, isOwner, isAdmin } =
    useWorkspacePermissions();
  const canManageInvites = canInviteWorkspaceMembers || isOwner || isAdmin;

  // Memo
  const queryParams = useMemo(
    () => ({
      page,
      search: debouncedSearch ?? "",
      limit: PAGE_LIMIT,
    }),
    [page, debouncedSearch],
  );

  // Hooks
  const { useWorkspaceInvites, useCreateWorkspaceInvite, useRevokeWorkspaceInvite } =
    useWorkspace();
  const { data: workspaceInvitesData, isPending: isGettingWorkspaceInvites } =
    useWorkspaceInvites(workspaceId!, queryParams);
  const createWorkspaceInviteMutation = useCreateWorkspaceInvite();
  const revokeWorkspaceInviteMutation = useRevokeWorkspaceInvite();

  const workspaceInvites = workspaceInvitesData?.data?.invites ?? [];

  const isInviteActionPending =
    createWorkspaceInviteMutation.isPending || revokeWorkspaceInviteMutation.isPending;

  const invalidateInviteQueries = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["get-workspaces-invites", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["get-workspaces-people", workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["get-user-workspaces"],
      }),
    ]);
  }, [queryClient, workspaceId]);

  const handleRevokeInvite = useCallback((invite: WorkspaceInvite) => {
    if (!workspaceId || !invite?.token || !canManageInvites) {
      return;
    }

    const request = revokeWorkspaceInviteMutation.mutateAsync({
      workspaceId,
      token: invite.token,
      reason: "Invite revoked from workspace people settings.",
    });

    toast.promise(request, {
      loading: "Revoking workspace invite...",
      success: async (response) => {
        await invalidateInviteQueries();
        return response?.data?.message || "Workspace invite revoked";
      },
      error: (error) =>
        error instanceof Error
          ? error.message
          : "Could not revoke workspace invite",
    });
  }, [
    canManageInvites,
    invalidateInviteQueries,
    revokeWorkspaceInviteMutation,
    workspaceId,
  ]);

  const handleResendInvite = useCallback((invite: WorkspaceInvite) => {
    if (!workspaceId || !invite?.email || !canManageInvites) {
      return;
    }

    const request = (async () => {
      const inviteStatus = getStatusLabel(invite);

      if (inviteStatus === "pending" && invite.token) {
        await revokeWorkspaceInviteMutation.mutateAsync({
          workspaceId,
          token: invite.token,
          reason: "Resending workspace invite.",
        });
      }

      const roleIds = (invite.roleIds || [])
        .map((role) => String(role?._id || "").trim())
        .filter(Boolean);

      return createWorkspaceInviteMutation.mutateAsync({
        workspaceId,
        data: [
          {
            email: invite.email,
            roleIds,
          },
        ],
      });
    })();

    toast.promise(request, {
      loading: "Resending workspace invite...",
      success: async (response) => {
        await invalidateInviteQueries();
        return response?.data?.message || "Workspace invite resent";
      },
      error: (error) =>
        error instanceof Error
          ? error.message
          : "Could not resend workspace invite",
    });
  }, [
    canManageInvites,
    createWorkspaceInviteMutation,
    invalidateInviteQueries,
    revokeWorkspaceInviteMutation,
    workspaceId,
  ]);

  const columns = useMemo(
    () =>
      getColumns({
        canManageInvites,
        isActionPending: isInviteActionPending,
        onResend: handleResendInvite,
        onRevoke: handleRevokeInvite,
      }),
    [
      canManageInvites,
      handleResendInvite,
      handleRevokeInvite,
      isInviteActionPending,
    ],
  );

  const table = useReactTable({
    data: workspaceInvites!,
    columns,
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: workspaceInvitesData?.data?.pagination?.totalPages ?? -1,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
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

  // Handlers
  const handleOpenAddMemberModalAction = () => {
    setShowAddMemberModal(true);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search by user email..."
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="max-w-sm"
        />
        <Button
          onClick={handleOpenAddMemberModalAction}
          disabled={!canManageInvites}
          title={
            !canManageInvites
              ? "Only workspace owners/admins can send invites."
              : undefined
          }
        >
          <Send />
          Invite a new member
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table?.getRowModel().rows?.length ? (
              table?.getRowModel().rows?.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
        {isGettingWorkspaceInvites && (
          <div className="flex items-center justify-center">
            <LoaderComponent />
          </div>
        )}
      </div>
      {(workspaceInvitesData?.data?.pagination?.total || 0) > PAGE_LIMIT && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2 flex items-center  gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  workspaceInvitesData?.data?.pagination
                    ?.hasPrevPage as boolean,
                  "decrease",
                );
              }}
              disabled={!workspaceInvitesData?.data?.pagination?.hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  workspaceInvitesData?.data?.pagination
                    ?.hasNextPage as boolean,
                  "increase",
                );
              }}
              disabled={!workspaceInvitesData?.data?.pagination?.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <SettingsWorkspacePeopleAddMembers
        open={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
      />
    </div>
  );
};

export default SettingsWorkspacePropleInvitesTable;

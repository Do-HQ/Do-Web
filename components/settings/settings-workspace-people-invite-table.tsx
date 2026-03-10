import React, { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  ArrowUpDown,
  CircleOff,
  Ellipsis,
  MailPlus,
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

export const columns: ColumnDef<WorkspaceInvite>[] = [
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
      const text = row.getValue("accepted");
      console.log(text, "Text");
      return (
        <Badge
          className={cn(
            "capitalize",
            text
              ? "bg-green-700/30 text-green-400"
              : "bg-yellow-700/30 text-yellow-400",
          )}
        >
          {row.getValue("accepted") ? "Accepted" : "Pending"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <MailPlus />
                Resend Invite
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
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
  const { canInviteWorkspaceMembers } = useWorkspacePermissions();

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
  const { useWorkspaceInvites } = useWorkspace();
  const { data: workspaceInvitesData, isPending: isGettingWorkspaceInvites } =
    useWorkspaceInvites(workspaceId!, queryParams);

  const workspaceInvites = workspaceInvitesData?.data?.invites ?? [];

  const table = useReactTable({
    data: workspaceInvites!,
    columns: columns,
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
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={handleOpenAddMemberModalAction}
          disabled={!canInviteWorkspaceMembers}
          title={
            !canInviteWorkspaceMembers
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
      {workspaceInvites?.length > PAGE_LIMIT && (
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

import React, { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ArrowDown01, ArrowUpDown } from "lucide-react";
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
  ChevronDown,
  Ellipsis,
  Settings2,
  Trash2,
  UserPlus2,
} from "lucide-react";
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
import { Input } from "../shared/input";
import useWorkspace from "@/hooks/use-workspace";
import LoaderComponent from "../shared/loader";
import { returnFullName } from "@/lib/helpers/return-full-name";
import useWorkspaceStore from "@/stores/workspace";
import { WorkspaceRole } from "@/types/workspace";
import { useDebounce } from "@/hooks/use-debounce";
import { PAGE_LIMIT } from "@/utils/constants";

interface User {
  name: string;
  email: string;
  teams: string;
  roleLabel: string;
  role: WorkspaceRole[];
  profileImage: string;
  activeTasks: number;
  score: number;
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Person",
    cell: ({ row }) => {
      const user: User = row.original; // full row data

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
                {user.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.name!}
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
          className="px-0 py-0 w-fit h-auto"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          size="sm"
        >
          Teams
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-left">{row.getValue("teams")}</div>,
  },
  {
    accessorKey: "role",
    header: () => <div className="text-left">Role</div>,
    cell: ({ row }) => {
      const roles: WorkspaceRole[] = row.getValue("role");

      const roleData = roles.map((r) => {
        return (
          <Badge
            className="capitalize text-center"
            variant="secondary"
            key={r?._id}
          >
            {r?.name}
          </Badge>
        );
      });

      return <div className="flex items-center gap-1">{roleData}</div>;
    },
  },
  {
    accessorKey: "activeTasks",
    header: () => <div className="text-left">Active Tasks</div>,
    cell: ({ row }) => {
      return (
        <div className="text-left font-medium">
          {row.getValue("activeTasks")}
        </div>
      );
    },
  },
  {
    accessorKey: "score",
    header: () => <div className="text-left">Score</div>,
    cell: ({ row }) => {
      return (
        <div className="text-left text-sm text-muted-foreground font-medium">
          {row.getValue("score")}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: () => {
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
                <UserPlus2 />
                View Person Details
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserPlus2 />
                Make Team lead
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings2 />
                Switch Teams
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
                <Trash2 />
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
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // States
  const { workspaceId } = useWorkspaceStore();

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

  // Queries
  const { useWorkspacePeople } = useWorkspace();
  const { isPending: isLoadingWorkspacePeole, data: woekspacePeopleData } =
    useWorkspacePeople(workspaceId!, {
      page,
      search: debouncedSearch!,
      limit: PAGE_LIMIT,
    });

  // Memo
  const workspacePeople: User[] = useMemo(() => {
    if (!woekspacePeopleData) {
      return [];
    }
    const wp = woekspacePeopleData?.data?.members?.map((d) => {
      return {
        name: returnFullName(d?.userId) || "No name",
        email: String(d?.userId?.email || ""),
        profileImage: d?.userId?.profilePhoto?.url,
        teams:
          d?.teams
            ?.filter((team) => team?.status === "active")
            .map((team) => team?.name)
            .filter(Boolean)
            .join(", ") || "No team",
        roleLabel:
          d?.roles
            ?.map((role) => role?.name)
            .filter(Boolean)
            .join(", ") || "Workspace member",
        role: d?.roles,
        activeTasks: 0,
        score: d?.score,
      };
    });

    return wp ?? [];
  }, [woekspacePeopleData]);

  const table = useReactTable({
    data: workspacePeople!,
    columns: columns!,
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search by user name ot team..."
          value={search}
          onChange={(event) => setSearch(event?.target?.value)}
          className="max-w-sm"
          type="search"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <ArrowDown01 /> Filter by Team <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        {isLoadingWorkspacePeole ? (
          <LoaderComponent />
        ) : (
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
              {table?.getRowModel()?.rows?.length ? (
                table?.getRowModel()?.rows?.map((row) => (
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
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      {workspacePeople?.length > PAGE_LIMIT && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2 flex items-center  gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  woekspacePeopleData?.data?.pagination?.hasPrevPage as boolean,
                  "decrease",
                );
              }}
              disabled={!woekspacePeopleData?.data?.pagination?.hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  woekspacePeopleData?.data?.pagination?.hasNextPage as boolean,
                  "increase",
                );
              }}
              disabled={!woekspacePeopleData?.data?.pagination?.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsWorkspacePeopleTable;

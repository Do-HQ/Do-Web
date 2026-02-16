import React, { useMemo } from "react";
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

interface User {
  name: string;
  team: string;
  role: string;
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
            <Avatar size="sm">
              <AvatarImage src={user.name} alt={user.name} />
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
    accessorKey: "team",
    header: ({ column }) => {
      return (
        <Button
          className="px-0 py-0 w-fit h-auto"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          size="sm"
        >
          Team
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="text-left">{row.getValue("team")}</div>,
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

  // States
  const { workspaceId } = useWorkspaceStore();

  // Queries
  const { useWorkspacePeople } = useWorkspace();
  const { isPending: isLoadingWorkspacePeole, data: woekspacePeopleData } =
    useWorkspacePeople(workspaceId!);

  // Memo
  const workspacePeople = useMemo(() => {
    if (!woekspacePeopleData) {
      return [];
    }
    const wp = woekspacePeopleData?.data?.members?.map((d) => {
      return {
        name: returnFullName(d?.userId),
        profileImage: d?.userId?.profilePhoto?.url,
        team: "No team",
        role: d?.roles,
        activeTasks: 0,
        score: d?.score,
      };
    });

    return wp;
  }, [woekspacePeopleData]);

  const table = useReactTable({
    data: workspacePeople!,
    columns: columns,
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
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="space-x-2 flex items-center  gap-4">
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
      </div>
    </div>
  );
};

export default SettingsWorkspacePeopleTable;

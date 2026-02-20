import React, { useMemo, useState } from "react";
import { Input } from "../shared/input";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";
import { useDebounce } from "@/hooks/use-debounce";
import { PAGE_LIMIT } from "@/utils/constants";
import { WorkspaceJoinRequest } from "@/types/workspace";
import { Button } from "../ui/button";
import {
  ArrowUpDown,
  Balloon,
  CircleOff,
  Construction,
  Ellipsis,
  MailPlus,
} from "lucide-react";
import dayjs from "dayjs";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoaderComponent from "../shared/loader";

interface JoinRequest {
  email: string;
  createdAt: string;
  status: string;
}

export const columns: ColumnDef<JoinRequest>[] = [
  {
    accessorKey: "email",
    header: "Email address",
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div className="flex items-center justify-start">Date created</div>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        {dayjs(row.getValue("createdAt")).format("Do MMMM, YYYY")}
      </div>
    ),
  },

  {
    accessorKey: "status",
    header: () => <div className="text-left">Status</div>,
    cell: ({ row }) => {
      const text = row.getValue("status");
      return (
        <Badge
          className={cn(
            "capitalize",
            text !== "pending"
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
                <Balloon />
                Accept Join Request
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
                <Construction />
                Decline Join Request
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const SettingsWorkspacePropleRequestsTable = () => {
  // States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Stores
  const { workspaceId } = useWorkspaceStore();

  // Utils
  const debouncedSearch = useDebounce(search, 500);

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
  const { useWorkspaceJoinRequests } = useWorkspace();
  const {
    data: workspaceJoinRequestsData,
    isPending: isGettingWorkspaceJoinRequests,
  } = useWorkspaceJoinRequests(workspaceId!, queryParams);

  const workspaceJoinRequests: JoinRequest[] = useMemo(() => {
    if (!workspaceJoinRequestsData) {
      return [];
    }
    return workspaceJoinRequestsData?.data?.requests?.map((d) => {
      return {
        email: d?.userId?.email,
        createdAt: d?.createdAt,
        status: d?.status,
      };
    });
  }, [workspaceJoinRequestsData]);

  const table = useReactTable({
    data: workspaceJoinRequests!,
    columns: columns,
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: workspaceJoinRequestsData?.data?.pagination?.totalPages ?? -1,
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search by user email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {isGettingWorkspaceJoinRequests && (
          <div className="flex items-center justify-center">
            <LoaderComponent />
          </div>
        )}
      </div>
      {workspaceJoinRequests?.length > PAGE_LIMIT && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2 flex items-center  gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  workspaceJoinRequestsData?.data?.pagination
                    ?.hasPrevPage as boolean,
                  "decrease",
                );
              }}
              disabled={
                !workspaceJoinRequestsData?.data?.pagination?.hasPrevPage
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(
                  workspaceJoinRequestsData?.data?.pagination
                    ?.hasNextPage as boolean,
                  "increase",
                );
              }}
              disabled={
                !workspaceJoinRequestsData?.data?.pagination?.hasNextPage
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsWorkspacePropleRequestsTable;

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  CheckCheck,
  Ellipsis,
  SearchX,
  XCircle,
} from "lucide-react";
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
import { toast } from "sonner";

import useWorkspace from "@/hooks/use-workspace";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import { useDebounce } from "@/hooks/use-debounce";
import useWorkspaceStore from "@/stores/workspace";
import { PAGE_LIMIT } from "@/utils/constants";
import type { WorkspaceJoinRequest } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoaderComponent from "../shared/loader";
import { Input } from "../shared/input";

type JoinRequestRow = {
  _id: string;
  email: string;
  requesterName: string;
  createdAt: string;
  status: string;
};

const SettingsWorkspacePropleRequestsTable = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { canModerateJoinRequests } = useWorkspacePermissions();
  const debouncedSearch = useDebounce(search, 500);

  const queryParams = useMemo(
    () => ({
      page,
      search: debouncedSearch ?? "",
      limit: PAGE_LIMIT,
    }),
    [page, debouncedSearch],
  );

  const {
    useWorkspaceJoinRequests,
    useApproveWorkspaceJoinRequest,
    useDeclineWorkspaceJoinRequest,
  } = useWorkspace();

  const {
    data: workspaceJoinRequestsData,
    isPending: isGettingWorkspaceJoinRequests,
  } = useWorkspaceJoinRequests(workspaceId!, queryParams);

  const refreshJoinRequests = () => {
    queryClient.invalidateQueries({
      queryKey: ["get-workspaces-join-requests", workspaceId],
    });
    queryClient.invalidateQueries({
      queryKey: ["get-workspaces-people", workspaceId],
    });
  };

  const { isPending: isApproving, mutateAsync: approveJoinRequest } =
    useApproveWorkspaceJoinRequest({
      onSuccess() {
        refreshJoinRequests();
      },
    });

  const { isPending: isDeclining, mutateAsync: declineJoinRequest } =
    useDeclineWorkspaceJoinRequest({
      onSuccess() {
        refreshJoinRequests();
      },
    });

  const workspaceJoinRequests: JoinRequestRow[] = useMemo(() => {
    const requests = workspaceJoinRequestsData?.data?.requests || [];

    return requests.map((request: WorkspaceJoinRequest) => ({
      _id: request._id,
      email: request?.userId?.email || "Unknown user",
      requesterName:
        [
          (request?.userId as { firstName?: string; firstname?: string } | undefined)
            ?.firstName ??
            request?.userId?.firstname,
          (request?.userId as { lastName?: string; lastnale?: string } | undefined)
            ?.lastName ??
            request?.userId?.lastnale,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || request?.userId?.email || "Unknown user",
      createdAt: request?.createdAt,
      status: request?.status,
    }));
  }, [workspaceJoinRequestsData]);

  const handleApprove = React.useCallback((requestId: string) => {
    if (!workspaceId || isApproving || isDeclining || !canModerateJoinRequests) {
      return;
    }

    const request = approveJoinRequest({
      workspaceId,
      requestId,
    });

    toast.promise(request, {
      loading: "Accepting join request...",
      success: (data) => data?.data?.message || "Join request accepted",
      error: "Could not accept join request",
    });
  }, [approveJoinRequest, canModerateJoinRequests, isApproving, isDeclining, workspaceId]);

  const handleDecline = React.useCallback((requestId: string) => {
    if (!workspaceId || isApproving || isDeclining || !canModerateJoinRequests) {
      return;
    }

    const request = declineJoinRequest({
      workspaceId,
      requestId,
    });

    toast.promise(request, {
      loading: "Declining join request...",
      success: (data) => data?.data?.message || "Join request declined",
      error: "Could not decline join request",
    });
  }, [canModerateJoinRequests, declineJoinRequest, isApproving, isDeclining, workspaceId]);

  const columns = useMemo<ColumnDef<JoinRequestRow>[]>(
    () => [
      {
        accessorKey: "requesterName",
        header: "Requester",
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex flex-col gap-1 py-0.5">
              <div className="font-medium leading-none">{original.requesterName}</div>
              <div className="text-muted-foreground text-xs">{original.email}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: () => <div className="flex items-center justify-start">Date created</div>,
        cell: ({ row }) => (
          <div className="text-left text-sm">
            {dayjs(row.original.createdAt).format("Do MMMM, YYYY")}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <div className="text-left">Status</div>,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              className={cn(
                "capitalize",
                status === "approved" && "bg-green-700/30 text-green-400",
                status === "rejected" && "bg-red-700/30 text-red-400",
                status === "pending" && "bg-yellow-700/30 text-yellow-400",
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
          const request = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isApproving || isDeclining || !canModerateJoinRequests}
                  title={
                    !canModerateJoinRequests
                      ? "Only workspace owners/admins can moderate join requests."
                      : undefined
                  }
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={!canModerateJoinRequests}
                    onClick={() => handleApprove(request._id)}
                  >
                    <CheckCheck />
                    Accept Join Request
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canModerateJoinRequests}
                    onClick={() => handleDecline(request._id)}
                  >
                    <XCircle />
                    Decline Join Request
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canModerateJoinRequests, handleApprove, handleDecline, isApproving, isDeclining],
  );

  const table = useReactTable({
    data: workspaceJoinRequests,
    columns,
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

  const handlPageUpdate = (isAllowed: boolean, mode: "increase" | "decrease") => {
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
  const totalPages = workspaceJoinRequestsData?.data?.pagination?.totalPages ?? 0;
  const hasPrevPage = Boolean(workspaceJoinRequestsData?.data?.pagination?.hasPrevPage);
  const hasNextPage = Boolean(workspaceJoinRequestsData?.data?.pagination?.hasNextPage);

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
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
                <TableCell colSpan={columns.length} className="h-24">
                  <Empty className="border-0 p-0 md:p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="size-8">
                        <SearchX className="size-3.5 text-primary/85" />
                      </EmptyMedia>
                      <EmptyDescription className="text-[12px]">
                        No pending join requests.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
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
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex items-center gap-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(hasPrevPage, "decrease");
              }}
              disabled={!hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlPageUpdate(hasNextPage, "increase");
              }}
              disabled={!hasNextPage}
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

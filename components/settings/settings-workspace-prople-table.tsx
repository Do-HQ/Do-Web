import React from "react";
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

interface User {
  id: string;
  user: string;
  status: string;
  team: string;
  role: string;
}

const data = [
  {
    id: "m5gr84i9",
    user: "Ezimorah Tobenna",
    status: "active",
    team: "Frontend Devs",
    role: "lead",
  },
  {
    id: "3u1reuv4",
    user: "Ohani Kizito",
    status: "active",
    team: "Product Owners",
    role: "owner",
  },
  {
    id: "derv1ws0",
    user: "Test user 1",
    status: "processing",
    team: "Designers",
    role: "admin",
  },
  {
    id: "5kma53ae",
    user: "Jeff Bezos",
    status: "active",
    team: "Testers",
    role: "member",
  },
  {
    id: "bhqecj4p",
    user: "Nwabufo Chinenye",
    status: "active",
    team: "Solution Architects",
    role: "member",
  },
];

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "user",
    header: "Person",
    cell: ({ row }) => (
      <div className="capitalize">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage
              src="https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png"
              alt="@shadcn"
            />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          {row.getValue("user")}
        </div>
      </div>
    ),
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
      return (
        <Badge className="capitalize text-center" variant="secondary">
          {row.getValue("role")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "tasks",
    header: () => <div className="text-center">Active Tasks</div>,
    cell: () => {
      return <div className="text-center font-medium">10</div>;
    },
  },
  {
    accessorKey: "last_updated",
    header: () => <div className="text-right">Score</div>,
    cell: () => {
      return (
        <div className="text-right text-sm text-muted-foreground font-medium">
          80%
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
                Disable {row?.getValue("user")}
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

  const table = useReactTable({
    data,
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search by user name ot team..."
          value={(table.getColumn("team")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("team")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <ArrowDown01 /> Filter by Team <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
        <Button>
          <UserPlus2 />
          Add a new member
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

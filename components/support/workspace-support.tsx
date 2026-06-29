"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Shield,
  Tag,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import axiosInstance from "@/lib/services";

import { useDebounce } from "@/hooks/use-debounce";
import useAuthStore from "@/stores/auth";
import useWorkspaceSupport from "@/hooks/use-workspace-support";
import useWorkspaceStore from "@/stores/workspace";
import {
  WorkspaceSupportTicketCategory,
  WorkspaceSupportTicketPriority,
  WorkspaceSupportTicketStatus,
} from "@/types/support";
import { cn } from "@/lib/utils";
import WorkspaceSupportTicketThread from "@/components/support/workspace-support-ticket-thread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CATEGORY_OPTIONS: Array<{
  value: WorkspaceSupportTicketCategory;
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug" },
  { value: "billing", label: "Billing" },
  { value: "access", label: "Access" },
  { value: "feature", label: "Feature request" },
];

const PRIORITY_OPTIONS: Array<{
  value: WorkspaceSupportTicketPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_FILTER_OPTIONS: Array<{
  value: WorkspaceSupportTicketStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_FILTER_OPTIONS: Array<{
  value: WorkspaceSupportTicketPriority | "all";
  label: string;
}> = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatRelativeHours = (hours: number | null) => {
  if (hours === null) {
    return "No SLA";
  }

  if (hours < 0) {
    return `${Math.abs(hours)}h overdue`;
  }

  if (hours === 0) {
    return "Due now";
  }

  return `${hours}h left`;
};

const statusBadgeClass = (status: WorkspaceSupportTicketStatus) => {
  if (status === "resolved") {
    return "bg-emerald-500/12 text-emerald-600 border-emerald-500/30 dark:text-emerald-300";
  }

  if (status === "closed") {
    return "bg-muted text-muted-foreground border-border/60";
  }

  if (status === "in-progress") {
    return "bg-blue-500/12 text-blue-600 border-blue-500/30 dark:text-blue-300";
  }

  return "bg-orange-500/12 text-orange-600 border-orange-500/30 dark:text-orange-300";
};

const priorityBadgeClass = (priority: WorkspaceSupportTicketPriority) => {
  if (priority === "urgent") {
    return "bg-red-500/12 text-red-600 border-red-500/30 dark:text-red-300";
  }

  if (priority === "high") {
    return "bg-orange-500/12 text-orange-600 border-orange-500/30 dark:text-orange-300";
  }

  if (priority === "low") {
    return "bg-muted text-muted-foreground border-border/60";
  }

  return "bg-blue-500/12 text-blue-600 border-blue-500/30 dark:text-blue-300";
};

interface WorkspaceSupportProps {
  internalOnly?: boolean;
}

export default function WorkspaceSupport({
  internalOnly = false,
}: WorkspaceSupportProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();
  const {
    useWorkspaceSupportTickets,
    useWorkspaceSupportQueue,
    useWorkspaceSupportSlaBoard,
    useCreateWorkspaceSupportTicket,
  } = useWorkspaceSupport();

  const activeWorkspaceId = String(workspaceId || "").trim();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<WorkspaceSupportTicketCategory>("general");
  const [priority, setPriority] =
    useState<WorkspaceSupportTicketPriority>("medium");

  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<
    WorkspaceSupportTicketStatus | "all"
  >("all");
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<
    WorkspaceSupportTicketPriority | "all"
  >("all");
  const [ticketPage, setTicketPage] = useState(1);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState<
    WorkspaceSupportTicketStatus | "all"
  >("all");
  const [queuePriorityFilter, setQueuePriorityFilter] = useState<
    WorkspaceSupportTicketPriority | "all"
  >("all");
  const [queueSlaFilter, setQueueSlaFilter] = useState<
    "all" | "breached" | "due-soon"
  >("all");
  const [queueAssigneeFilter, setQueueAssigneeFilter] = useState("all");
  const [queuePage, setQueuePage] = useState(1);
  const [activeAdminSection, setActiveAdminSection] = useState<
    "queue" | "whats-next" | "sla"
  >("queue");

  type WhatsNextItem = { title: string; description: string; docUrl: string };
  const [whatsNextItems, setWhatsNextItems] = useState<WhatsNextItem[]>([]);
  const [editingWhatsNextIdx, setEditingWhatsNextIdx] = useState<number | null>(
    null,
  );
  const [whatsNextDraft, setWhatsNextDraft] = useState<WhatsNextItem>({
    title: "",
    description: "",
    docUrl: "",
  });

  const { data: fetchedWhatsNext } = useQuery<WhatsNextItem[]>({
    queryKey: ["whats-next"],
    queryFn: async () => {
      const res = await axiosInstance.get<{ data: WhatsNextItem[] }>(
        "/public/whats-next",
      );
      return res.data?.data ?? [];
    },
    enabled: internalOnly,
  });

  useEffect(() => {
    if (fetchedWhatsNext) setWhatsNextItems(fetchedWhatsNext);
  }, [fetchedWhatsNext]);

  const { mutate: saveWhatsNext, isPending: isSavingWhatsNext } = useMutation({
    mutationFn: (items: WhatsNextItem[]) =>
      axiosInstance.put("/internal/whats-next", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whats-next"] });
      toast.success("What to expect next updated.");
    },
    onError: () => toast.error("Failed to save — please try again."),
  });

  const debouncedTicketSearch = useDebounce(ticketSearch, 320);
  const debouncedQueueSearch = useDebounce(queueSearch, 320);
  const isInternalSupportAgent = Boolean(user?.isInternal);
  const isAdminView = internalOnly;

  const openTicketThread = useCallback((ticketId: string) => {
    const normalizedTicketId = String(ticketId || "").trim();
    if (!normalizedTicketId) return;
    setSelectedTicketId(normalizedTicketId);
  }, []);

  const ticketsQuery = useWorkspaceSupportTickets(
    activeWorkspaceId,
    {
      page: ticketPage,
      limit: 12,
      search: debouncedTicketSearch,
      status: ticketStatusFilter,
      priority: ticketPriorityFilter,
    },
    {
      enabled: Boolean(activeWorkspaceId && !isAdminView),
    },
  );

  const queueQuery = useWorkspaceSupportQueue(
    activeWorkspaceId,
    {
      page: queuePage,
      limit: 12,
      search: debouncedQueueSearch,
      status: queueStatusFilter,
      priority: queuePriorityFilter,
      sla: queueSlaFilter,
      assigneeUserId: queueAssigneeFilter === "all" ? "" : queueAssigneeFilter,
    },
    {
      enabled: Boolean(
        activeWorkspaceId && isInternalSupportAgent && isAdminView,
      ),
    },
  );

  const slaBoardQuery = useWorkspaceSupportSlaBoard(activeWorkspaceId, {
    enabled: Boolean(
      activeWorkspaceId && isInternalSupportAgent && isAdminView,
    ),
  });

  const createTicketMutation = useCreateWorkspaceSupportTicket({
    onSuccess: (response) => {
      const nextTicketId = String(response?.data?.ticket?.id || "").trim();
      if (nextTicketId) {
        openTicketThread(nextTicketId);
      }

      setSubject("");
      setDescription("");
      setCategory("general");
      setPriority("medium");

      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-tickets" &&
          query.queryKey[1] === activeWorkspaceId,
      });
    },
  });

  const tickets = useMemo(
    () => ticketsQuery.data?.data?.tickets ?? [],
    [ticketsQuery.data?.data?.tickets],
  );
  const ticketsPagination = ticketsQuery.data?.data?.pagination;
  const queueTickets = queueQuery.data?.data?.tickets || [];
  const queuePagination = queueQuery.data?.data?.pagination;
  const slaBoard = slaBoardQuery.data?.data?.stats;
  const visibleTickets = isAdminView ? queueTickets : tickets;
  const visiblePagination = isAdminView ? queuePagination : ticketsPagination;

  const openTicketsCount = useMemo(
    () => visibleTickets.filter((ticket) => ticket.status === "open").length,
    [visibleTickets],
  );

  const handleCreateTicket = async () => {
    if (!activeWorkspaceId) {
      toast("Select a workspace first.");
      return;
    }

    if (subject.trim().length < 3) {
      toast("Ticket subject should be at least 3 characters.");
      return;
    }

    if (description.trim().length < 8) {
      toast("Please describe the issue in more detail.");
      return;
    }

    const loadingId = toast.loading("Creating ticket...");
    try {
      await createTicketMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        payload: {
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
        },
      });
      setCreateTicketOpen(false);
      setSubject("");
      setDescription("");
      setCategory("general");
      setPriority("medium");
      toast.success("Ticket created", { id: loadingId });
    } catch {
      toast.error("Could not create support ticket.", { id: loadingId });
    }
  };

  if (internalOnly && !isInternalSupportAgent) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Empty className="border-border/40 bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shield className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Internal support access required</EmptyTitle>
            <EmptyDescription>
              This queue is available only to internal support operators.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  if (!isAdminView && isInternalSupportAgent) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Empty className="border-border/40 bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shield className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Use Support Admin queue</EmptyTitle>
            <EmptyDescription>
              Internal operators handle tickets from the dedicated admin queue.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            type="button"
            onClick={() => router.replace("/support/admin")}
          >
            Open Support Admin
          </Button>
        </Empty>
      </section>
    );
  }

  const ticketListPanel = (
    <>
      {/* Ticket list sidebar */}
      <aside className="flex w-82 shrink-0 flex-col overflow-hidden border-r border-border/35 bg-card/70">
        <div className="border-b border-border/35 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {isAdminView ? "Ticket Queue" : "My Tickets"}
              </p>
              <p className="text-muted-foreground text-sm">
                {visiblePagination?.total ?? 0} total · {openTicketsCount} open
              </p>
            </div>
            {!isAdminView ? (
              <Button
                size="icon-sm"
                variant="outline"
                className="size-7"
                onClick={() => setCreateTicketOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="mt-2 space-y-2.5">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <Input
                value={isAdminView ? queueSearch : ticketSearch}
                onChange={(e) => {
                  if (isAdminView) {
                    setQueueSearch(e.target.value);
                    setQueuePage(1);
                  } else {
                    setTicketSearch(e.target.value);
                    setTicketPage(1);
                  }
                }}
                placeholder="Search tickets"
                className="h-8 pl-6 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              <Select
                value={isAdminView ? queueStatusFilter : ticketStatusFilter}
                onValueChange={(v) => {
                  if (isAdminView) {
                    setQueueStatusFilter(
                      v as WorkspaceSupportTicketStatus | "all",
                    );
                    setQueuePage(1);
                  } else {
                    setTicketStatusFilter(
                      v as WorkspaceSupportTicketStatus | "all",
                    );
                    setTicketPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-xs"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={isAdminView ? queuePriorityFilter : ticketPriorityFilter}
                onValueChange={(v) => {
                  if (isAdminView) {
                    setQueuePriorityFilter(
                      v as WorkspaceSupportTicketPriority | "all",
                    );
                    setQueuePage(1);
                  } else {
                    setTicketPriorityFilter(
                      v as WorkspaceSupportTicketPriority | "all",
                    );
                    setTicketPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTER_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-xs"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Ticket list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleTickets.length ? (
            visibleTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => openTicketThread(ticket.id)}
                className={cn(
                  "w-full border-b border-border/25 px-4 py-2.5 text-left transition-colors hover:bg-muted/40",
                  selectedTicketId === ticket.id && "bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium">
                    {ticket.subject}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 shrink-0 rounded-sm px-1 text-[9px] capitalize",
                      statusBadgeClass(ticket.status),
                    )}
                  >
                    {ticket.status?.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                  {ticket.lastMessagePreview || ticket.description}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 rounded-sm px-1 text-[9px] capitalize",
                      priorityBadgeClass(ticket.priority),
                    )}
                  >
                    {ticket.priority?.toLowerCase()}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {formatRelativeHours(ticket.slaRemainingHours)}
                  </span>
                  {ticket.slaBreached ? (
                    <AlertCircle className="size-3 text-red-500" />
                  ) : null}
                  <span className="text-muted-foreground ml-auto text-[10px]">
                    {formatDateTime(ticket.lastMessageAt)}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="flex h-full min-h-[12rem] items-center justify-center px-3">
              <Empty className="border-0 p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Tag className="size-4 text-primary/85" />
                  </EmptyMedia>
                  <EmptyDescription className="text-center text-sm">
                    {isAdminView
                      ? "No tickets match your filters."
                      : "No tickets yet. Create your first one."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/30 px-3 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={!visiblePagination?.hasPrevPage}
            onClick={() =>
              isAdminView
                ? setQueuePage((p) => Math.max(1, p - 1))
                : setTicketPage((p) => Math.max(1, p - 1))
            }
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            {visiblePagination?.page ?? 1} /{" "}
            {visiblePagination?.totalPages ?? 1}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={!visiblePagination?.hasNextPage}
            onClick={() =>
              isAdminView
                ? setQueuePage((p) => p + 1)
                : setTicketPage((p) => p + 1)
            }
          >
            Next
          </Button>
        </div>
      </aside>

      {/* Thread panel */}
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card/70">
        {selectedTicketId ? (
          <WorkspaceSupportTicketThread
            key={selectedTicketId}
            ticketId={selectedTicketId}
            internalOnly={internalOnly}
            inlineMode
            onBack={() => setSelectedTicketId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Tag className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyDescription className="text-sm">
                  Select a ticket to view the conversation
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </section>
    </>
  );

  return (
    <section
      className="flex h-full min-h-0 overflow-hidden"
      data-tour-id="support-shell"
    >
      {isAdminView ? (
        <>
          {/* Admin nav sidebar */}
          <nav className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border/35 bg-card/70">
            <div className="border-b border-border/35 px-3 py-2.5">
              <p className="text-sm font-semibold">Support Admin</p>
              <p className="text-muted-foreground text-sm">Internal queue</p>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {(
                [
                  { id: "queue", label: "Ticket Queue", icon: Ticket },
                  { id: "whats-next", label: "What's Next", icon: Megaphone },
                  { id: "sla", label: "SLA Board", icon: Shield },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveAdminSection(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                    activeAdminSection === item.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-3.5 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-auto border-t border-border/35 p-2">
              <Link
                href="/dashboard"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                <LayoutDashboard className="size-3.5 shrink-0" />
                Workspace
              </Link>
            </div>
          </nav>

          {activeAdminSection === "queue" ? (
            ticketListPanel
          ) : activeAdminSection === "whats-next" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">What to expect next</p>
                  <p className="text-muted-foreground text-sm">
                    Feature preview cards shown on the user dashboard.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-sm"
                    onClick={() => {
                      setWhatsNextDraft({
                        title: "",
                        description: "",
                        docUrl: "",
                      });
                      setEditingWhatsNextIdx(-1);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add item
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-sm"
                    disabled={isSavingWhatsNext}
                    onClick={() => saveWhatsNext(whatsNextItems)}
                  >
                    {isSavingWhatsNext ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {whatsNextItems.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No items yet. Add the first one above.
                  </p>
                ) : (
                  whatsNextItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border/35 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {item.title || "Untitled"}
                        </p>
                        {item.description ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {item.description}
                          </p>
                        ) : null}
                        {item.docUrl ? (
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {item.docUrl}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6"
                          onClick={() => {
                            setWhatsNextDraft(item);
                            setEditingWhatsNextIdx(idx);
                          }}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6 text-destructive hover:text-destructive"
                          onClick={() =>
                            setWhatsNextItems((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeAdminSection === "sla" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">SLA breach board</p>
                <p className="text-muted-foreground text-sm">
                  Live support queue pressure for your workspace.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: "Open",
                    value: slaBoard?.totalOpen ?? 0,
                    icon: Ticket,
                    tone: "text-foreground",
                  },
                  {
                    label: "Breached",
                    value: slaBoard?.breached ?? 0,
                    icon: AlertTriangle,
                    tone: "text-red-500",
                  },
                  {
                    label: "Due soon",
                    value: slaBoard?.dueSoon ?? 0,
                    icon: AlertCircle,
                    tone: "text-orange-500",
                  },
                  {
                    label: "Unassigned",
                    value: slaBoard?.unassigned ?? 0,
                    icon: Users,
                    tone: "text-blue-500",
                  },
                  {
                    label: "High priority",
                    value: slaBoard?.highPriority ?? 0,
                    icon: Shield,
                    tone: "text-violet-500",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border/35 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        {item.label}
                      </p>
                      <item.icon className={cn("size-3.5", item.tone)} />
                    </div>
                    <p className={cn("mt-1 text-xl font-semibold", item.tone)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        ticketListPanel
      )}

      {/* What's Next edit/add Dialog */}
      <Dialog
        open={editingWhatsNextIdx !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWhatsNextIdx(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWhatsNextIdx === -1 ? "Add item" : "Edit item"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for this What to Expect card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={whatsNextDraft.title}
                onChange={(e) =>
                  setWhatsNextDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="e.g. AI task assistant"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={whatsNextDraft.description}
                onChange={(e) =>
                  setWhatsNextDraft((d) => ({
                    ...d,
                    description: e.target.value,
                  }))
                }
                placeholder="Short description of the upcoming feature"
                className="min-h-20 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Doc URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                value={whatsNextDraft.docUrl}
                onChange={(e) =>
                  setWhatsNextDraft((d) => ({ ...d, docUrl: e.target.value }))
                }
                placeholder="https://..."
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => setEditingWhatsNextIdx(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => {
                if (editingWhatsNextIdx === -1) {
                  setWhatsNextItems((prev) => [...prev, whatsNextDraft]);
                } else if (editingWhatsNextIdx !== null) {
                  setWhatsNextItems((prev) =>
                    prev.map((it, i) =>
                      i === editingWhatsNextIdx ? whatsNextDraft : it,
                    ),
                  );
                }
                setEditingWhatsNextIdx(null);
              }}
            >
              {editingWhatsNextIdx === -1 ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New support ticket</DialogTitle>
            <DialogDescription>
              Describe your issue clearly so support can respond faster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={category}
                  onValueChange={(v) =>
                    setCategory(v as WorkspaceSupportTicketCategory)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                        className="text-sm"
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as WorkspaceSupportTicketPriority)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem
                        key={p.value}
                        value={p.value}
                        className="text-sm"
                      >
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail…"
                className="min-h-24 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => setCreateTicketOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-sm"
              disabled={createTicketMutation.isPending}
              onClick={() => void handleCreateTicket()}
            >
              {createTicketMutation.isPending ? "Creating…" : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

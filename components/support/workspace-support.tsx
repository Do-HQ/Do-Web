"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import useWorkspace from "@/hooks/use-workspace";
import useAuthStore from "@/stores/auth";
import useWorkspaceSupport from "@/hooks/use-workspace-support";
import useWorkspaceStore from "@/stores/workspace";
import {
  WorkspaceSupportTicketCategory,
  WorkspaceSupportTicketPriority,
  WorkspaceSupportTicketStatus,
} from "@/types/support";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const SLA_FILTER_OPTIONS: Array<{
  value: "all" | "breached" | "due-soon";
  label: string;
}> = [
  { value: "all", label: "All SLA" },
  { value: "breached", label: "Breached" },
  { value: "due-soon", label: "Due soon" },
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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();
  const workspaceHook = useWorkspace();
  const {
    useWorkspaceSupportTickets,
    useWorkspaceSupportTicketDetail,
    useWorkspaceSupportTicketMessages,
    useWorkspaceSupportTicketInternalNotes,
    useWorkspaceSupportKnowledgeBase,
    useWorkspaceSupportStatus,
    useWorkspaceSupportQueue,
    useWorkspaceSupportSlaBoard,
    useCreateWorkspaceSupportTicket,
    useUpdateWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketMessage,
    useAssignWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketInternalNote,
  } = useWorkspaceSupport();

  const activeWorkspaceId = String(workspaceId || "").trim();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<WorkspaceSupportTicketCategory>("general");
  const [priority, setPriority] =
    useState<WorkspaceSupportTicketPriority>("medium");

  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] =
    useState<WorkspaceSupportTicketStatus | "all">("all");
  const [ticketPriorityFilter, setTicketPriorityFilter] =
    useState<WorkspaceSupportTicketPriority | "all">("all");
  const [ticketPage, setTicketPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState("");

  const [messageBody, setMessageBody] = useState("");
  const [internalNoteBody, setInternalNoteBody] = useState("");

  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] =
    useState<WorkspaceSupportTicketStatus | "all">("all");
  const [queuePriorityFilter, setQueuePriorityFilter] =
    useState<WorkspaceSupportTicketPriority | "all">("all");
  const [queueSlaFilter, setQueueSlaFilter] = useState<"all" | "breached" | "due-soon">("all");
  const [queueAssigneeFilter, setQueueAssigneeFilter] = useState("all");
  const [queuePage, setQueuePage] = useState(1);

  const debouncedTicketSearch = useDebounce(ticketSearch, 320);
  const debouncedKnowledgeQuery = useDebounce(knowledgeQuery, 280);
  const debouncedQueueSearch = useDebounce(queueSearch, 320);
  const selectedTicketIdFromQuery = String(searchParams.get("ticket") || "").trim();
  const isInternalSupportAgent = Boolean(user?.isInternal);
  const isAdminView = internalOnly;
  const baseSupportRoute = internalOnly ? "/support/admin" : "/support";
  const showLegacyInlineThread = Boolean(selectedTicketIdFromQuery);

  const selectTicket = useCallback(
    (ticketId: string) => {
      const normalizedTicketId = String(ticketId || "").trim();
      setSelectedTicketId(normalizedTicketId);

      if (!normalizedTicketId) {
        router.replace(baseSupportRoute, { scroll: false });
        return;
      }

      router.replace(
        `${baseSupportRoute}?ticket=${encodeURIComponent(normalizedTicketId)}`,
        {
          scroll: false,
        },
      );
    },
    [baseSupportRoute, router],
  );

  const openTicketThread = useCallback(
    (ticketId: string) => {
      const normalizedTicketId = String(ticketId || "").trim();
      if (!normalizedTicketId) {
        return;
      }

      router.push(
        `${baseSupportRoute}/tickets/${encodeURIComponent(normalizedTicketId)}`,
      );
    },
    [baseSupportRoute, router],
  );

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

  const statusQuery = useWorkspaceSupportStatus(activeWorkspaceId, {
    enabled: Boolean(activeWorkspaceId),
  });

  const kbQuery = useWorkspaceSupportKnowledgeBase(
    activeWorkspaceId,
    {
      query: debouncedKnowledgeQuery,
      limit: 6,
    },
    {
      enabled: Boolean(activeWorkspaceId && !isAdminView),
    },
  );

  const ticketDetailQuery = useWorkspaceSupportTicketDetail(
    activeWorkspaceId,
    selectedTicketId,
    {
      enabled: Boolean(activeWorkspaceId && selectedTicketId && showLegacyInlineThread),
    },
  );

  const ticketMessagesQuery = useWorkspaceSupportTicketMessages(
    activeWorkspaceId,
    selectedTicketId,
    {
      page: 1,
      limit: 60,
    },
    {
      enabled: Boolean(activeWorkspaceId && selectedTicketId && showLegacyInlineThread),
    },
  );

  const ticketInternalNotesQuery = useWorkspaceSupportTicketInternalNotes(
    activeWorkspaceId,
    selectedTicketId,
    {
      page: 1,
      limit: 60,
    },
    {
      enabled: Boolean(
        activeWorkspaceId &&
          selectedTicketId &&
          isInternalSupportAgent &&
          showLegacyInlineThread,
      ),
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
      assigneeUserId:
        queueAssigneeFilter === "all" ? "" : queueAssigneeFilter,
    },
    {
      enabled: Boolean(activeWorkspaceId && isInternalSupportAgent && isAdminView),
    },
  );

  const slaBoardQuery = useWorkspaceSupportSlaBoard(activeWorkspaceId, {
    enabled: Boolean(activeWorkspaceId && isInternalSupportAgent && isAdminView),
  });

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    activeWorkspaceId,
    {
      page: 1,
      limit: 100,
      search: "",
    },
  );

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

  const updateTicketMutation = useUpdateWorkspaceSupportTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-detail" &&
          query.queryKey[1] === activeWorkspaceId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-tickets" &&
          query.queryKey[1] === activeWorkspaceId,
      });
    },
    onError: () => {
      toast.error("Could not update support ticket.");
    },
  });

  const createTicketMessageMutation = useCreateWorkspaceSupportTicketMessage({
    onSuccess: () => {
      setMessageBody("");
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-messages" &&
          query.queryKey[1] === activeWorkspaceId &&
          query.queryKey[2] === selectedTicketId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-tickets" &&
          query.queryKey[1] === activeWorkspaceId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-detail" &&
          query.queryKey[1] === activeWorkspaceId &&
          query.queryKey[2] === selectedTicketId,
      });
    },
    onError: () => {
      toast.error("Could not send support message.");
    },
  });

  const assignTicketMutation = useAssignWorkspaceSupportTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-detail" &&
          query.queryKey[1] === activeWorkspaceId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-tickets" &&
          query.queryKey[1] === activeWorkspaceId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-queue" &&
          query.queryKey[1] === activeWorkspaceId,
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-sla-board" &&
          query.queryKey[1] === activeWorkspaceId,
      });
    },
    onError: () => {
      toast.error("Could not assign support ticket.");
    },
  });

  const createInternalNoteMutation = useCreateWorkspaceSupportTicketInternalNote(
    {
      onSuccess: () => {
        setInternalNoteBody("");
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "workspace-support-ticket-internal-notes" &&
            query.queryKey[1] === activeWorkspaceId &&
            query.queryKey[2] === selectedTicketId,
        });
      },
      onError: () => {
        toast.error("Could not add internal note.");
      },
    },
  );

  const tickets = useMemo(
    () => ticketsQuery.data?.data?.tickets ?? [],
    [ticketsQuery.data?.data?.tickets],
  );
  const ticketsPagination = ticketsQuery.data?.data?.pagination;
  const selectedTicket = ticketDetailQuery.data?.data?.ticket;
  const messages = ticketMessagesQuery.data?.data?.messages || [];
  const internalNotes = ticketInternalNotesQuery.data?.data?.notes || [];
  const statusData = statusQuery.data?.data;
  const kbArticles = kbQuery.data?.data?.articles || [];
  const queueTickets = queueQuery.data?.data?.tickets || [];
  const queuePagination = queueQuery.data?.data?.pagination;
  const slaBoard = slaBoardQuery.data?.data?.stats;
  const workspaceMembers = workspacePeopleQuery.data?.data?.members || [];
  const visibleTickets = isAdminView ? queueTickets : tickets;
  const visiblePagination = isAdminView ? queuePagination : ticketsPagination;

  const openTicketsCount = useMemo(
    () => visibleTickets.filter((ticket) => ticket.status === "open").length,
    [visibleTickets],
  );

  useEffect(() => {
    if (!showLegacyInlineThread) {
      return;
    }
    if (selectedTicketIdFromQuery) {
      setSelectedTicketId(selectedTicketIdFromQuery);
    }
  }, [selectedTicketIdFromQuery, showLegacyInlineThread]);

  useEffect(() => {
    if (!showLegacyInlineThread) {
      return;
    }
    if (!visibleTickets.length) {
      setSelectedTicketId("");
      return;
    }

    if (selectedTicketIdFromQuery) {
      return;
    }

    if (!selectedTicketId) {
      setSelectedTicketId(visibleTickets[0].id);
      return;
    }

    if (!visibleTickets.some((ticket) => ticket.id === selectedTicketId)) {
      selectTicket(visibleTickets[0].id);
    }
  }, [
    visibleTickets,
    selectedTicketId,
    selectTicket,
    selectedTicketIdFromQuery,
    showLegacyInlineThread,
  ]);

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
      toast.success("Ticket created", { id: loadingId });
    } catch {
      toast.error("Could not create support ticket.", { id: loadingId });
    }
  };

  const handleUpdateStatus = async (status: WorkspaceSupportTicketStatus) => {
    if (!activeWorkspaceId || !selectedTicketId) {
      return;
    }

    await updateTicketMutation.mutateAsync({
      workspaceId: activeWorkspaceId,
      ticketId: selectedTicketId,
      updates: {
        status,
      },
    });
  };

  const handleSendMessage = async () => {
    if (!activeWorkspaceId || !selectedTicketId) {
      return;
    }

    if (messageBody.trim().length < 2) {
      toast("Write a short message before sending.");
      return;
    }

    await createTicketMessageMutation.mutateAsync({
      workspaceId: activeWorkspaceId,
      ticketId: selectedTicketId,
      payload: {
        body: messageBody.trim(),
      },
    });
  };

  const handleAssignTicket = async (assigneeUserId: string) => {
    if (!activeWorkspaceId || !selectedTicketId || !isInternalSupportAgent) {
      return;
    }

    await assignTicketMutation.mutateAsync({
      workspaceId: activeWorkspaceId,
      ticketId: selectedTicketId,
      payload: {
        assigneeUserId: assigneeUserId === "unassigned" ? "" : assigneeUserId,
      },
    });
  };

  const handleCreateInternalNote = async () => {
    if (!activeWorkspaceId || !selectedTicketId || !isInternalSupportAgent) {
      return;
    }

    if (internalNoteBody.trim().length < 2) {
      toast("Write a short internal note.");
      return;
    }

    await createInternalNoteMutation.mutateAsync({
      workspaceId: activeWorkspaceId,
      ticketId: selectedTicketId,
      payload: {
        body: internalNoteBody.trim(),
      },
    });
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
          <Button type="button" onClick={() => router.replace("/support/admin")}>
            Open Support Admin
          </Button>
        </Empty>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4" data-tour-id="support-shell">
      <Card className="border-border/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="space-y-0.5">
            <div className="text-base font-semibold">
              {isAdminView ? "Support Admin Queue" : "Help & Support"}
            </div>
            <p className="text-muted-foreground text-[12px]">
              {isAdminView
                ? "Respond to tickets, assign ownership, and monitor queue health."
                : "Create support tickets, follow updates, and search quick fixes."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 rounded-md px-2 text-[11px]">
              <Ticket className="size-3.5" />
              {openTicketsCount} open
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "h-6 rounded-md px-2 text-[11px]",
                statusData?.overall === "operational"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-300",
              )}
            >
              <CheckCircle2 className="size-3.5" />
              {statusData?.overall === "operational"
                ? "Systems operational"
                : "Service degraded"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          "grid gap-4",
          isAdminView
            ? "xl:grid-cols-[minmax(0,1fr)]"
            : "xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]",
        )}
      >
        {!isAdminView ? (
          <div className="flex flex-col gap-4">
          <Card className="border-border/35" data-tour-id="support-ticket-form">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-[14px]">Create ticket</CardTitle>
              <CardDescription className="text-[12px]">
                Share context clearly so support can respond faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ticket subject"
                className="h-9 text-[12px]"
              />

              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={category}
                  onValueChange={(nextValue) =>
                    setCategory(nextValue as WorkspaceSupportTicketCategory)
                  }
                >
                  <SelectTrigger className="h-9 w-full text-[12px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priority}
                  onValueChange={(nextValue) =>
                    setPriority(nextValue as WorkspaceSupportTicketPriority)
                  }
                >
                  <SelectTrigger className="h-9 w-full text-[12px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what is blocked and what you expected."
                className="min-h-28 text-[12px]"
              />

              <Button
                type="button"
                className="h-9 w-full text-[12px]"
                onClick={() => void handleCreateTicket()}
                loading={createTicketMutation.isPending}
                disabled={createTicketMutation.isPending}
              >
                <Plus className="size-4" />
                Create ticket
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/35" data-tour-id="support-knowledge-base">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-[14px]">Knowledge base</CardTitle>
              <CardDescription className="text-[12px]">
                Search quick guides before opening a new ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  value={knowledgeQuery}
                  onChange={(event) => setKnowledgeQuery(event.target.value)}
                  placeholder="Search help articles"
                  className="h-9 pl-8 text-[12px]"
                />
              </div>

              <ScrollArea className="h-56 rounded-md border border-border/35">
                <div className="space-y-2 p-2">
                  {kbArticles.length ? (
                    kbArticles.map((article) => {
                      const normalizedRoute = String(article.route || "").trim();
                      const canNavigate =
                        normalizedRoute.startsWith("/") &&
                        normalizedRoute !== "/undefined" &&
                        normalizedRoute !== "undefined";

                      return (
                        <button
                          type="button"
                          key={article.id}
                          onClick={() => {
                            if (canNavigate) {
                              router.push(normalizedRoute);
                            }
                          }}
                          className={cn(
                            "w-full rounded-md border border-border/25 px-2.5 py-2 text-left transition",
                            canNavigate
                              ? "hover:bg-accent/60 cursor-pointer"
                              : "cursor-default opacity-80",
                          )}
                          disabled={!canNavigate}
                        >
                          <div className="line-clamp-1 text-[12px] font-medium">
                            {article.title}
                          </div>
                          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                            {article.summary}
                          </p>
                          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
                            <BookOpen className="size-3" />
                            {(article.tags || []).slice(0, 3).join(" · ")}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <Empty className="border-none p-4">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Search className="size-4" />
                        </EmptyMedia>
                        <EmptyTitle className="text-[13px]">No articles found</EmptyTitle>
                        <EmptyDescription className="text-[11px]">
                          Try a broader keyword.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <Card className="border-border/35" data-tour-id="support-ticket-list">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-[14px]">
                  {isAdminView ? "Admin queue" : "My tickets"}
                </CardTitle>
                <div className="text-muted-foreground text-[11px]">
                  {visiblePagination?.total ?? 0} total
                </div>
              </div>
              {!isAdminView ? (
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                  <Input
                    value={ticketSearch}
                    onChange={(event) => {
                      setTicketSearch(event.target.value);
                      setTicketPage(1);
                    }}
                    placeholder="Search tickets"
                    className="h-9 text-[12px]"
                  />
                  <Select
                    value={ticketStatusFilter}
                    onValueChange={(nextValue) => {
                      setTicketStatusFilter(
                        nextValue as WorkspaceSupportTicketStatus | "all",
                      );
                      setTicketPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-[12px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={ticketPriorityFilter}
                    onValueChange={(nextValue) => {
                      setTicketPriorityFilter(
                        nextValue as WorkspaceSupportTicketPriority | "all",
                      );
                      setTicketPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-[12px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-5">
                  <Input
                    value={queueSearch}
                    onChange={(event) => {
                      setQueueSearch(event.target.value);
                      setQueuePage(1);
                    }}
                    placeholder="Search queue"
                    className="h-8 text-[11px]"
                  />
                  <Select
                    value={queueStatusFilter}
                    onValueChange={(nextValue) => {
                      setQueueStatusFilter(
                        nextValue as WorkspaceSupportTicketStatus | "all",
                      );
                      setQueuePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-[11px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={queuePriorityFilter}
                    onValueChange={(nextValue) => {
                      setQueuePriorityFilter(
                        nextValue as WorkspaceSupportTicketPriority | "all",
                      );
                      setQueuePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-[11px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={queueSlaFilter}
                    onValueChange={(nextValue) => {
                      setQueueSlaFilter(
                        nextValue as "all" | "breached" | "due-soon",
                      );
                      setQueuePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-[11px]">
                      <SelectValue placeholder="SLA" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLA_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={queueAssigneeFilter}
                    onValueChange={(nextValue) => {
                      setQueueAssigneeFilter(nextValue);
                      setQueuePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-[11px]">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {workspaceMembers.map((member) => {
                        const userItem = member.userId;
                        const userId = String(userItem?._id || "").trim();
                        if (!userId) {
                          return null;
                        }

                        const name = [userItem?.firstName, userItem?.lastName]
                          .filter(Boolean)
                          .join(" ")
                          .trim() || String(userItem?.email || userId);
                        return (
                          <SelectItem key={userId} value={userId}>
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <ScrollArea className="h-64 rounded-md border border-border/30">
                <div className="divide-y divide-border/30">
                  {visibleTickets.length ? (
                    visibleTickets.map((ticket) => {
                      return (
                        <button
                          type="button"
                          key={ticket.id}
                          onClick={() => openTicketThread(ticket.id)}
                          className={cn(
                            "hover:bg-accent/45 w-full px-3 py-2.5 text-left transition",
                            "bg-transparent",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="line-clamp-1 text-[12px] font-medium">
                              {ticket.subject}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 rounded-sm px-1.5 text-[10px]",
                                statusBadgeClass(ticket.status),
                              )}
                            >
                              {ticket.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 rounded-sm px-1.5 text-[10px]",
                                priorityBadgeClass(ticket.priority),
                              )}
                            >
                              {ticket.priority}
                            </Badge>
                            <span className="text-muted-foreground">
                              {formatRelativeHours(ticket.slaRemainingHours)}
                            </span>
                            {ticket.slaBreached ? (
                              <AlertCircle className="size-3.5 text-red-500" />
                            ) : null}
                          </div>
                          <p className="text-muted-foreground mt-1 line-clamp-1 text-[11px]">
                            {ticket.lastMessagePreview || ticket.description}
                          </p>
                          <div className="text-muted-foreground mt-1 text-[10px]">
                            {formatDateTime(ticket.lastMessageAt)}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3">
                      <Empty className="border-none p-4">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <LifeBuoy className="size-4" />
                          </EmptyMedia>
                          <EmptyTitle className="text-[13px]">No tickets yet</EmptyTitle>
                          <EmptyDescription className="text-[11px]">
                            {isAdminView
                              ? "No tickets match your queue filters."
                              : "Create your first support ticket to start tracking issues."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  disabled={!visiblePagination?.hasPrevPage}
                  onClick={() =>
                    isAdminView
                      ? setQueuePage((prev) => Math.max(1, prev - 1))
                      : setTicketPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Previous
                </Button>
                <div className="text-muted-foreground text-[11px]">
                  Page {visiblePagination?.page ?? 1} of{" "}
                  {visiblePagination?.totalPages ?? 1}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  disabled={!visiblePagination?.hasNextPage}
                  onClick={() =>
                    isAdminView
                      ? setQueuePage((prev) => prev + 1)
                      : setTicketPage((prev) => prev + 1)
                  }
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

          {showLegacyInlineThread ? (
            <Card className="border-border/35" data-tour-id="support-ticket-thread">
            <CardHeader className="space-y-1 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-[14px]">Ticket thread</CardTitle>
                {selectedTicket ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-sm px-1.5 text-[10px]",
                        statusBadgeClass(selectedTicket.status),
                      )}
                    >
                      {selectedTicket.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-sm px-1.5 text-[10px]",
                        priorityBadgeClass(selectedTicket.priority),
                      )}
                    >
                      {selectedTicket.priority}
                    </Badge>
                    {isInternalSupportAgent ? (
                      <Select
                        value={
                          selectedTicket.assignedToUserId || "unassigned"
                        }
                        onValueChange={(nextValue) =>
                          void handleAssignTicket(nextValue)
                        }
                      >
                        <SelectTrigger className="h-7 w-[11rem] text-[10px]">
                          <SelectValue placeholder="Assign owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {workspaceMembers.map((member) => {
                            const user = member.userId;
                            const userId = String(user?._id || "").trim();
                            if (!userId) {
                              return null;
                            }
                            const name = [user?.firstName, user?.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .trim() || String(user?.email || userId);
                            return (
                              <SelectItem key={userId} value={userId}>
                                {name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {selectedTicket ? (
                <div className="space-y-1">
                  <div className="text-[13px] font-medium">{selectedTicket.subject}</div>
                  <div className="text-muted-foreground text-[11px]">
                    Created {formatDateTime(selectedTicket.createdAt)} • SLA {formatRelativeHours(selectedTicket.slaRemainingHours)}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    Assigned to{" "}
                    <span className="text-foreground font-medium">
                      {selectedTicket.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                  {isInternalSupportAgent ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(["open", "in-progress", "resolved", "closed"] as const).map(
                        (status) => (
                          <Button
                            key={status}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-7 rounded-sm px-2 text-[10px] capitalize",
                              selectedTicket.status === status
                                ? "bg-primary/10 text-primary border-primary/35"
                                : "",
                            )}
                            onClick={() => void handleUpdateStatus(status)}
                            disabled={updateTicketMutation.isPending}
                          >
                            {status}
                          </Button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <CardDescription className="text-[12px]">
                  Select a ticket to view and reply.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <ScrollArea className="h-64 rounded-md border border-border/30">
                <div className="space-y-2 p-3">
                  {selectedTicket ? (
                    messages.length ? (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "rounded-md border px-2.5 py-2",
                            message.source === "system"
                              ? "bg-muted/35 border-border/45"
                              : "bg-background border-border/35",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-medium">
                              {message.author.name}
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {formatDateTime(message.createdAt)}
                            </div>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5">
                            {message.body}
                          </p>
                        </div>
                      ))
                    ) : (
                      <Empty className="border-none p-4">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <MessageSquare className="size-4" />
                          </EmptyMedia>
                          <EmptyTitle className="text-[13px]">No replies yet</EmptyTitle>
                          <EmptyDescription className="text-[11px]">
                            Send a follow-up to keep this ticket moving.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )
                  ) : (
                    <Empty className="border-none p-4">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Ticket className="size-4" />
                        </EmptyMedia>
                        <EmptyTitle className="text-[13px]">No ticket selected</EmptyTitle>
                        <EmptyDescription className="text-[11px]">
                          Pick a ticket from the list to view discussion.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </ScrollArea>

              <div className="flex items-end gap-2">
                <Textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder={
                    selectedTicket
                      ? "Write a follow-up message"
                      : "Select a ticket first"
                  }
                  className="min-h-14 text-[12px]"
                  disabled={
                    !selectedTicket ||
                    selectedTicket.status === "closed" ||
                    createTicketMessageMutation.isPending
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-3 text-[12px]"
                  onClick={() => void handleSendMessage()}
                  disabled={
                    !selectedTicket ||
                    selectedTicket.status === "closed" ||
                    createTicketMessageMutation.isPending
                  }
                >
                  <Send className="size-4" />
                  Send
                </Button>
              </div>

              {isInternalSupportAgent ? (
                <div className="space-y-2 rounded-md border border-border/30 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-medium">Internal notes</div>
                    <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[10px]">
                      Internal only
                    </Badge>
                  </div>
                  <ScrollArea className="h-28 rounded-md border border-border/25">
                    <div className="space-y-1.5 p-2">
                      {internalNotes.length ? (
                        internalNotes.map((note) => (
                          <div
                            key={note.id}
                            className="rounded-sm border border-border/25 bg-muted/25 px-2 py-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-medium">
                                {note.author.name}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {formatDateTime(note.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-[11px]">
                              {note.body}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground p-2 text-[11px]">
                          No internal notes yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={internalNoteBody}
                      onChange={(event) => setInternalNoteBody(event.target.value)}
                      placeholder={
                        selectedTicket
                          ? "Add an internal handling note"
                          : "Select a ticket first"
                      }
                      className="min-h-12 text-[11px]"
                      disabled={!selectedTicket || createInternalNoteMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[11px]"
                      onClick={() => void handleCreateInternalNote()}
                      disabled={!selectedTicket || createInternalNoteMutation.isPending}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
            </Card>
          ) : (
            <Card className="border-border/35">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-[14px]">Ticket conversations</CardTitle>
                <CardDescription className="text-[12px]">
                  Open a ticket to continue the conversation in a dedicated thread page.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {isAdminView && isInternalSupportAgent ? (
        <Card className="border-border/35">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-[14px]">SLA breach board</CardTitle>
            <CardDescription className="text-[12px]">
              Live support queue pressure for your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
                className="rounded-md border border-border/30 bg-muted/20 px-2.5 py-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    {item.label}
                  </div>
                  <item.icon className={cn("size-3.5", item.tone)} />
                </div>
                <div className={cn("mt-1 text-lg font-semibold", item.tone)}>
                  {item.value}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

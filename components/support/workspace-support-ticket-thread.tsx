"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceSupport from "@/hooks/use-workspace-support";
import {
  WorkspaceSupportTicketPriority,
  WorkspaceSupportTicketStatus,
} from "@/types/support";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoaderComponent from "@/components/shared/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface WorkspaceSupportTicketThreadProps {
  ticketId: string;
  internalOnly?: boolean;
}

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

export default function WorkspaceSupportTicketThread({
  ticketId,
  internalOnly = false,
}: WorkspaceSupportTicketThreadProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const workspaceHook = useWorkspace();
  const {
    useWorkspaceSupportTicketDetail,
    useWorkspaceSupportTicketMessages,
    useWorkspaceSupportTicketInternalNotes,
    useCreateWorkspaceSupportTicketMessage,
    useUpdateWorkspaceSupportTicket,
    useAssignWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketInternalNote,
  } = useWorkspaceSupport();

  const activeWorkspaceId = String(workspaceId || "").trim();
  const normalizedTicketId = String(ticketId || "").trim();
  const isInternalSupportAgent = Boolean(user?.isInternal);
  const baseSupportRoute = internalOnly ? "/support/admin" : "/support";

  const [messageBody, setMessageBody] = useState("");
  const [internalNoteBody, setInternalNoteBody] = useState("");

  const ticketDetailQuery = useWorkspaceSupportTicketDetail(
    activeWorkspaceId,
    normalizedTicketId,
    {
      enabled: Boolean(activeWorkspaceId && normalizedTicketId),
    },
  );

  const ticketMessagesQuery = useWorkspaceSupportTicketMessages(
    activeWorkspaceId,
    normalizedTicketId,
    {
      page: 1,
      limit: 120,
    },
    {
      enabled: Boolean(activeWorkspaceId && normalizedTicketId),
    },
  );

  const ticketInternalNotesQuery = useWorkspaceSupportTicketInternalNotes(
    activeWorkspaceId,
    normalizedTicketId,
    {
      page: 1,
      limit: 120,
    },
    {
      enabled: Boolean(
        activeWorkspaceId && normalizedTicketId && isInternalSupportAgent,
      ),
    },
  );

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    activeWorkspaceId,
    {
      page: 1,
      limit: 100,
      search: "",
    },
  );

  const updateTicketMutation = useUpdateWorkspaceSupportTicket();
  const createTicketMessageMutation = useCreateWorkspaceSupportTicketMessage();
  const assignTicketMutation = useAssignWorkspaceSupportTicket();
  const createInternalNoteMutation = useCreateWorkspaceSupportTicketInternalNote();

  const ticket = ticketDetailQuery.data?.data?.ticket;
  const messages = ticketMessagesQuery.data?.data?.messages || [];
  const internalNotes = ticketInternalNotesQuery.data?.data?.notes || [];
  const workspaceMembers = workspacePeopleQuery.data?.data?.members || [];

  const isLoading = ticketDetailQuery.isLoading || ticketMessagesQuery.isLoading;
  const isClosed = String(ticket?.status || "") === "closed";

  const invalidateTicketQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "workspace-support-ticket-detail" &&
        query.queryKey[1] === activeWorkspaceId,
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "workspace-support-ticket-messages" &&
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
  };

  const handleUpdateStatus = async (status: WorkspaceSupportTicketStatus) => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent) {
      return;
    }

    const loadingId = toast.loading("Updating ticket status...");
    try {
      await updateTicketMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        updates: { status },
      });
      invalidateTicketQueries();
      toast.success("Ticket status updated", { id: loadingId });
    } catch {
      toast.error("Could not update support ticket.", { id: loadingId });
    }
  };

  const handleSendMessage = async () => {
    if (!activeWorkspaceId || !normalizedTicketId) {
      return;
    }

    if (messageBody.trim().length < 2) {
      toast("Write a short message before sending.");
      return;
    }

    const loadingId = toast.loading("Sending message...");
    try {
      await createTicketMessageMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        payload: { body: messageBody.trim() },
      });
      setMessageBody("");
      invalidateTicketQueries();
      toast.success("Message sent", { id: loadingId });
    } catch {
      toast.error("Could not send support message.", { id: loadingId });
    }
  };

  const handleAssignTicket = async (assigneeUserId: string) => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent) {
      return;
    }

    const loadingId = toast.loading("Updating assignment...");
    try {
      await assignTicketMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        payload: {
          assigneeUserId: assigneeUserId === "unassigned" ? "" : assigneeUserId,
        },
      });
      invalidateTicketQueries();
      toast.success("Assignment updated", { id: loadingId });
    } catch {
      toast.error("Could not assign support ticket.", { id: loadingId });
    }
  };

  const handleCreateInternalNote = async () => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent) {
      return;
    }

    if (internalNoteBody.trim().length < 2) {
      toast("Write a short internal note.");
      return;
    }

    const loadingId = toast.loading("Adding internal note...");
    try {
      await createInternalNoteMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        payload: { body: internalNoteBody.trim() },
      });
      setInternalNoteBody("");
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-internal-notes" &&
          query.queryKey[1] === activeWorkspaceId &&
          query.queryKey[2] === normalizedTicketId,
      });
      toast.success("Internal note added", { id: loadingId });
    } catch {
      toast.error("Could not add internal note.", { id: loadingId });
    }
  };

  if (!normalizedTicketId) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Empty className="border-border/40 bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Invalid ticket thread</EmptyTitle>
            <EmptyDescription>Please select a valid support ticket.</EmptyDescription>
          </EmptyHeader>
          <Button type="button" onClick={() => router.replace(baseSupportRoute)}>
            Back to support
          </Button>
        </Empty>
      </section>
    );
  }

  if (!internalOnly && isInternalSupportAgent) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Empty className="border-border/40 bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Open this thread in Support Admin</EmptyTitle>
            <EmptyDescription>
              Internal operators handle ticket threads from the admin queue.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            type="button"
            onClick={() =>
              router.replace(
                `/support/admin/tickets/${encodeURIComponent(normalizedTicketId)}`,
              )
            }
          >
            Open in Support Admin
          </Button>
        </Empty>
      </section>
    );
  }

  if (internalOnly && !isInternalSupportAgent) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
        <Empty className="border-border/40 bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Internal support access required</EmptyTitle>
            <EmptyDescription>
              This ticket thread is available only to internal support operators.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-4" data-tour-id="support-ticket-thread-page">
      <Card className="border-border/35">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-[11px]"
              onClick={() => router.replace(baseSupportRoute)}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {ticket ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 rounded-sm px-1.5 text-[10px]",
                    statusBadgeClass(ticket.status),
                  )}
                >
                  {ticket.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 rounded-sm px-1.5 text-[10px]",
                    priorityBadgeClass(ticket.priority),
                  )}
                >
                  {ticket.priority}
                </Badge>
                {isInternalSupportAgent ? (
                  <Select
                    value={ticket.assignedToUserId || "unassigned"}
                    onValueChange={(nextValue) => void handleAssignTicket(nextValue)}
                  >
                    <SelectTrigger className="h-7 w-[11rem] text-[10px]">
                      <SelectValue placeholder="Assign owner" />
                    </SelectTrigger>
                    <SelectContent>
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
                ) : null}
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <LoaderComponent />
          ) : ticket ? (
            <div className="space-y-1">
              <CardTitle className="text-[15px]">{ticket.subject}</CardTitle>
              <CardDescription className="text-[12px]">
                Created {formatDateTime(ticket.createdAt)} • SLA {formatRelativeHours(ticket.slaRemainingHours)}
              </CardDescription>
              <div className="text-muted-foreground text-[11px]">
                Assigned to <span className="text-foreground font-medium">{ticket.assignedTo?.name || "Unassigned"}</span>
              </div>
              {isInternalSupportAgent ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(["open", "in-progress", "resolved", "closed"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-7 rounded-sm px-2 text-[10px] capitalize",
                        ticket.status === status
                          ? "bg-primary/10 text-primary border-primary/35"
                          : "",
                      )}
                      onClick={() => void handleUpdateStatus(status)}
                      disabled={updateTicketMutation.isPending}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <CardDescription className="text-[12px]">Ticket not found.</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <ScrollArea className="h-[52vh] rounded-md border border-border/30">
            <div className="space-y-2 p-3">
              {messages.length ? (
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
                      <div className="text-[11px] font-medium">{message.author.name}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {formatDateTime(message.createdAt)}
                      </div>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5">{message.body}</p>
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
                      Send a message to continue this ticket thread.
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
              placeholder={ticket ? "Write a follow-up message" : "Ticket unavailable"}
              className="min-h-14 text-[12px]"
              disabled={!ticket || isClosed || createTicketMessageMutation.isPending}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={() => void handleSendMessage()}
              loading={createTicketMessageMutation.isPending}
              disabled={!ticket || isClosed || createTicketMessageMutation.isPending}
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
                          <span className="text-[10px] font-medium">{note.author.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[11px]">{note.body}</p>
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
                  placeholder={ticket ? "Add an internal handling note" : "Ticket unavailable"}
                  className="min-h-12 text-[11px]"
                  disabled={!ticket || createInternalNoteMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[11px]"
                  onClick={() => void handleCreateInternalNote()}
                  loading={createInternalNoteMutation.isPending}
                  disabled={!ticket || createInternalNoteMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

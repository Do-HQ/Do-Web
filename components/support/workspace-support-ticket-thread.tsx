"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribeTicket,
  unsubscribeTicket,
  type SupportMessageCreatedPayload,
  type SupportTicketUpdatedPayload,
} from "@/lib/realtime/support-socket";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceSupport from "@/hooks/use-workspace-support";
import useFile from "@/hooks/use-file";
import {
  WorkspaceSupportTicketPriority,
  WorkspaceSupportTicketStatus,
} from "@/types/support";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoaderComponent from "@/components/shared/loader";
import ReviewDialog, { StarRating } from "@/components/shared/review-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";

interface WorkspaceSupportTicketThreadProps {
  ticketId: string;
  internalOnly?: boolean;
  inlineMode?: boolean;
  onBack?: () => void;
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Just now";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatRelativeHours = (hours: number | null) => {
  if (hours === null) return "No SLA";
  if (hours < 0) return `${Math.abs(hours)}h overdue`;
  if (hours === 0) return "Due now";
  return `${hours}h left`;
};

const formatStatus = (s: string) => {
  if (s === "in-progress") return "In Progress";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatPriority = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

const statusBadgeClass = (status: WorkspaceSupportTicketStatus) => {
  if (status === "resolved")
    return "bg-emerald-500/12 text-emerald-600 border-emerald-500/30 dark:text-emerald-300";
  if (status === "closed")
    return "bg-muted text-muted-foreground border-border/60";
  if (status === "in-progress")
    return "bg-blue-500/12 text-blue-600 border-blue-500/30 dark:text-blue-300";
  return "bg-orange-500/12 text-orange-600 border-orange-500/30 dark:text-orange-300";
};

const priorityBadgeClass = (priority: WorkspaceSupportTicketPriority) => {
  if (priority === "urgent")
    return "bg-red-500/12 text-red-600 border-red-500/30 dark:text-red-300";
  if (priority === "high")
    return "bg-orange-500/12 text-orange-600 border-orange-500/30 dark:text-orange-300";
  if (priority === "low")
    return "bg-muted text-muted-foreground border-border/60";
  return "bg-blue-500/12 text-blue-600 border-blue-500/30 dark:text-blue-300";
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";

function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold uppercase select-none",
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export default function WorkspaceSupportTicketThread({
  ticketId,
  internalOnly = false,
  inlineMode = false,
  onBack,
}: WorkspaceSupportTicketThreadProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const workspaceHook = useWorkspace();
  const { useUploadAsset } = useFile();
  const {
    useWorkspaceSupportTicketDetail,
    useWorkspaceSupportTicketMessages,
    useWorkspaceSupportTicketInternalNotes,
    useCreateWorkspaceSupportTicketMessage,
    useUpdateWorkspaceSupportTicket,
    useAssignWorkspaceSupportTicket,
    useCreateWorkspaceSupportTicketInternalNote,
    useSubmitWorkspaceSupportTicketReview,
  } = useWorkspaceSupport();

  const activeWorkspaceId = String(workspaceId || "").trim();
  const normalizedTicketId = String(ticketId || "").trim();
  const isInternalSupportAgent = Boolean(user?.isInternal);
  const baseSupportRoute = internalOnly ? "/support/admin" : "/support";
  const currentUserId = String(user?._id || "").trim();

  const [messageBody, setMessageBody] = useState("");
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recentSocketEventRef = useRef<Map<string, number>>(new Map());

  const uploadAssetMutation = useUploadAsset();

  const ticketDetailQuery = useWorkspaceSupportTicketDetail(
    activeWorkspaceId,
    normalizedTicketId,
    { enabled: Boolean(activeWorkspaceId && normalizedTicketId) },
  );

  const ticketMessagesQuery = useWorkspaceSupportTicketMessages(
    activeWorkspaceId,
    normalizedTicketId,
    { page: 1, limit: 120 },
    { enabled: Boolean(activeWorkspaceId && normalizedTicketId) },
  );

  const ticketInternalNotesQuery = useWorkspaceSupportTicketInternalNotes(
    activeWorkspaceId,
    normalizedTicketId,
    { page: 1, limit: 120 },
    {
      enabled: Boolean(
        activeWorkspaceId && normalizedTicketId && isInternalSupportAgent,
      ),
    },
  );

  const workspacePeopleQuery = workspaceHook.useWorkspacePeople(
    activeWorkspaceId,
    { page: 1, limit: 100, search: "" },
  );

  const updateTicketMutation = useUpdateWorkspaceSupportTicket();
  const createTicketMessageMutation = useCreateWorkspaceSupportTicketMessage();
  const assignTicketMutation = useAssignWorkspaceSupportTicket();
  const createInternalNoteMutation =
    useCreateWorkspaceSupportTicketInternalNote();
  const submitReviewMutation = useSubmitWorkspaceSupportTicketReview();

  const ticket = ticketDetailQuery.data?.data?.ticket;
  const messages = ticketMessagesQuery.data?.data?.messages || [];
  const internalNotes = ticketInternalNotesQuery.data?.data?.notes || [];
  const workspaceMembers = workspacePeopleQuery.data?.data?.members || [];

  const isLoading =
    ticketDetailQuery.isLoading || ticketMessagesQuery.isLoading;
  const isClosed = String(ticket?.status || "") === "closed";

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPrompted, setReviewPrompted] = useState(false);

  // Show review prompt when ticket transitions to closed (customer only)
  useEffect(() => {
    if (isClosed && !isInternalSupportAgent && !reviewPrompted && !ticket?.review && ticket?.id) {
      setReviewPrompted(true);
      setReviewOpen(true);
    }
  }, [isClosed, isInternalSupportAgent, reviewPrompted, ticket?.review, ticket?.id]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!activeWorkspaceId || !normalizedTicketId) return;
    try {
      await submitReviewMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        payload: { rating, comment: comment || undefined },
      });
      setReviewOpen(false);
      toast.success("Thank you for your feedback!");
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "workspace-support-ticket-detail" &&
          q.queryKey[1] === activeWorkspaceId,
      });
    } catch {
      toast.error("Could not submit review — please try again.");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!activeWorkspaceId || !normalizedTicketId) return;

    const socket = subscribeTicket({ workspaceId: activeWorkspaceId, ticketId: normalizedTicketId });

    const dedupeEvent = (key: string) => {
      const now = Date.now();
      const buffer = recentSocketEventRef.current;
      buffer.forEach((seenAt, k) => { if (now - seenAt > 90_000) buffer.delete(k); });
      if (buffer.has(key)) return true;
      buffer.set(key, now);
      return false;
    };

    const handleMessageCreated = ({ workspaceId, ticketId, message }: SupportMessageCreatedPayload) => {
      if (String(workspaceId) !== activeWorkspaceId) return;
      if (String(ticketId) !== normalizedTicketId) return;
      const msgId = String(message?.id || "").trim();
      if (msgId && dedupeEvent(`msg:${msgId}`)) return;
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-messages" &&
          query.queryKey[1] === activeWorkspaceId &&
          query.queryKey[2] === normalizedTicketId,
      });
    };

    const handleTicketUpdated = ({ workspaceId, ticketId }: SupportTicketUpdatedPayload) => {
      if (String(workspaceId) !== activeWorkspaceId) return;
      if (String(ticketId) !== normalizedTicketId) return;
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "workspace-support-ticket-detail" &&
          query.queryKey[1] === activeWorkspaceId &&
          query.queryKey[2] === normalizedTicketId,
      });
    };

    socket.on("support:message:created", handleMessageCreated);
    socket.on("support:ticket:updated", handleTicketUpdated);

    return () => {
      socket.off("support:message:created", handleMessageCreated);
      socket.off("support:ticket:updated", handleTicketUpdated);
      unsubscribeTicket({ workspaceId: activeWorkspaceId, ticketId: normalizedTicketId });
    };
  }, [activeWorkspaceId, normalizedTicketId, queryClient]);

  const goBack = () => {
    if (onBack) onBack();
    else router.replace(baseSupportRoute);
  };

  const invalidateTicketQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        [
          "workspace-support-ticket-detail",
          "workspace-support-ticket-messages",
          "workspace-support-tickets",
          "workspace-support-queue",
          "workspace-support-sla-board",
        ].includes(String(query.queryKey[0])) &&
        query.queryKey[1] === activeWorkspaceId,
    });
  };

  const handleUpdateStatus = async (status: WorkspaceSupportTicketStatus) => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent)
      return;
    const loadingId = toast.loading("Updating status...");
    try {
      await updateTicketMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        updates: { status },
      });
      invalidateTicketQueries();
      toast.success("Status updated", { id: loadingId });
    } catch {
      toast.error("Could not update status.", { id: loadingId });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) fileInputRef.current = e.target;
    e.target.value = "";
    if (!file) return;
    if (pendingImages.length >= 4) {
      toast("You can attach up to 4 images per message.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    if (activeWorkspaceId) form.append("workspaceId", activeWorkspaceId);
    form.append("folder", "support");
    setIsUploadingImage(true);
    try {
      const res = await uploadAssetMutation.mutateAsync(form);
      const url = res?.data?.asset?.url;
      if (url) setPendingImages((prev) => [...prev, url]);
    } catch {
      toast.error("Image upload failed.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeWorkspaceId || !normalizedTicketId) return;
    const trimmed = messageBody.trim();
    if (trimmed.length < 2 && pendingImages.length === 0) {
      toast("Write a short message first.");
      return;
    }
    const body = trimmed.length >= 2 ? trimmed : "📎";
    const loadingId = toast.loading("Sending...");
    try {
      await createTicketMessageMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ticketId: normalizedTicketId,
        payload: { body, imageUrls: pendingImages },
      });
      setMessageBody("");
      setPendingImages([]);
      invalidateTicketQueries();
      toast.dismiss(loadingId);
    } catch {
      toast.error("Could not send message.", { id: loadingId });
    }
  };

  const handleAssignTicket = async (assigneeUserId: string) => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent)
      return;
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
      toast.error("Could not assign ticket.", { id: loadingId });
    }
  };

  const handleCreateInternalNote = async () => {
    if (!activeWorkspaceId || !normalizedTicketId || !isInternalSupportAgent)
      return;
    if (internalNoteBody.trim().length < 2) {
      toast("Write a short note first.");
      return;
    }
    const loadingId = toast.loading("Adding note...");
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
      toast.success("Note added", { id: loadingId });
    } catch {
      toast.error("Could not add note.", { id: loadingId });
    }
  };

  if (!normalizedTicketId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare className="size-4" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">Invalid ticket</EmptyTitle>
            <EmptyDescription className="text-sm">
              Select a valid support ticket.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" onClick={goBack}>
            Go back
          </Button>
        </Empty>
      </div>
    );
  }

  if (!internalOnly && isInternalSupportAgent) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="size-4" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">Open in Support Admin</EmptyTitle>
            <EmptyDescription className="text-sm">
              Internal operators handle tickets from the admin queue.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            size="sm"
            onClick={() =>
              router.replace(
                `/support/admin/tickets/${encodeURIComponent(normalizedTicketId)}`,
              )
            }
          >
            Open in Support Admin
          </Button>
        </Empty>
      </div>
    );
  }

  if (internalOnly && !isInternalSupportAgent) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="size-4" />
            </EmptyMedia>
            <EmptyTitle className="text-sm">
              Internal access required
            </EmptyTitle>
            <EmptyDescription className="text-sm">
              Only internal support operators can view this thread.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-tour-id="support-ticket-thread-page"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border/35 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            onClick={goBack}
          >
            <X className="size-4" />
          </Button>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            ) : ticket ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="max-w-xs truncate text-sm font-semibold">
                  {ticket.subject}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 shrink-0 rounded-sm px-1.5 text-[10px]",
                    statusBadgeClass(ticket.status),
                  )}
                >
                  {formatStatus(ticket.status)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 shrink-0 rounded-sm px-1.5 text-[10px]",
                    priorityBadgeClass(ticket.priority),
                  )}
                >
                  {formatPriority(ticket.priority)}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Ticket not found</p>
            )}
          </div>

          {/* Actions */}
          {ticket ? (
            isInternalSupportAgent ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 shrink-0"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                      Change Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {(
                        ["open", "in-progress", "resolved", "closed"] as const
                      ).map((s) => (
                        <DropdownMenuItem
                          key={s}
                          className={cn(
                            "text-sm",
                            ticket.status === s && "font-semibold",
                          )}
                          onClick={() => void handleUpdateStatus(s)}
                        >
                          {formatStatus(s)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm">
                      Reassign
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        className="text-sm"
                        onClick={() => void handleAssignTicket("unassigned")}
                      >
                        Unassigned
                      </DropdownMenuItem>
                      {workspaceMembers.map((member) => {
                        const u = member.userId;
                        const uid = String(u?._id || "").trim();
                        if (!uid) return null;
                        const name =
                          [u?.firstName, u?.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim() || String(u?.email || uid);
                        return (
                          <DropdownMenuItem
                            key={uid}
                            className="text-sm"
                            onClick={() => void handleAssignTicket(uid)}
                          >
                            {name}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <p className="text-muted-foreground shrink-0 text-xs">
                SLA: {formatRelativeHours(ticket.slaRemainingHours)}
              </p>
            )
          ) : null}
        </div>

        {ticket && !isLoading ? (
          <div className="mt-1 pl-9 flex items-center gap-2 flex-wrap">
            <p className="text-muted-foreground text-xs">
              Opened {formatDateTime(ticket.createdAt)}
              {ticket.assignedTo?.name
                ? ` · Assigned to ${ticket.assignedTo.name}`
                : " · Unassigned"}
            </p>
            {ticket.review ? (
              <div className="flex items-center gap-1.5">
                <StarRating rating={ticket.review.rating} />
                <span className="text-muted-foreground text-[10px]">
                  by {ticket.review.submittedBy.name}
                </span>
                {ticket.review.comment ? (
                  <span className="text-muted-foreground text-[10px]">
                    · &ldquo;{ticket.review.comment}&rdquo;
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoaderComponent />
          </div>
        ) : messages.length ? (
          <div className="flex flex-col gap-6">
            {messages.map((message) => {
              const isSystem = message.source === "system";
              if (isSystem) {
                return (
                  <div key={message.id} className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/30" />
                    <p className="text-muted-foreground shrink-0 text-xs">
                      {message.body}
                    </p>
                    <div className="h-px flex-1 bg-border/30" />
                  </div>
                );
              }

              const authorId = String(
                message.author?.id || message.authorUserId || "",
              ).trim();
              const isMine = Boolean(
                currentUserId && authorId && authorId === currentUserId,
              );
              const authorName = String(message.author?.name || "?");
              const avatarSrc = message.author?.avatarUrl || null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isMine ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <UserAvatar
                    name={authorName}
                    src={avatarSrc}
                    className="mb-0.5 size-7"
                  />
                  <div
                    className={cn(
                      "flex max-w-[72%] flex-col gap-0.5",
                      isMine ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-baseline gap-1.5",
                        isMine ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="text-xs font-semibold">
                        {authorName}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm leading-5 whitespace-pre-wrap",
                        isMine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted/60 text-foreground",
                      )}
                    >
                      {message.body}
                      {message.imageUrls?.length > 0 && (
                        <div className={cn("mt-2 flex flex-wrap gap-1.5", isMine ? "justify-end" : "justify-start")}>
                          {message.imageUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt="attachment"
                                className="max-h-48 max-w-[220px] rounded-lg object-cover border border-border/20"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare className="size-4" />
                </EmptyMedia>
                <EmptyTitle className="text-sm">No messages yet</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Send a message to start the conversation.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </div>

      {/* Internal notes (admin only) */}
      {isInternalSupportAgent ? (
        <div className="shrink-0 border-t border-border/35">
          <button
            type="button"
            onClick={() => setShowInternalNotes((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Internal notes</span>
              <Badge
                variant="outline"
                className="h-4 rounded-sm px-1 text-[9px]"
              >
                {internalNotes.length}
              </Badge>
            </div>
            <span className="text-muted-foreground text-[10px]">
              {showInternalNotes ? "Hide" : "Show"}
            </span>
          </button>

          {showInternalNotes ? (
            <div className="border-t border-border/25 px-4 pb-3">
              <div className="max-h-40 overflow-y-auto py-2">
                {internalNotes.length ? (
                  internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="mb-2 rounded-md border border-amber-500/15 bg-amber-500/8 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {note.author.name}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {formatDateTime(note.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">
                        {note.body}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-1 text-sm">
                    No internal notes yet.
                  </p>
                )}
              </div>
              <div className="flex items-end gap-2 pt-1">
                <Textarea
                  value={internalNoteBody}
                  onChange={(e) => setInternalNoteBody(e.target.value)}
                  placeholder="Add an internal handling note…"
                  className="min-h-9 resize-none text-sm"
                  disabled={!ticket || createInternalNoteMutation.isPending}
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 text-xs"
                  onClick={() => void handleCreateInternalNote()}
                  disabled={!ticket || createInternalNoteMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Composer */}
      <div className="shrink-0 border-t border-border/35 bg-card/70 px-4 py-3">
        {pendingImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((url, i) => (
              <div key={i} className="relative">
                <img
                  src={url}
                  alt="pending"
                  className="size-14 rounded-md object-cover border border-border/30"
                />
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background hover:opacity-80"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <UserAvatar
            name={
              [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
              String(user?.email || "Me")
            }
            src={user?.profilePhoto?.url || null}
            className="mb-0.5 size-7"
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 border-border/40">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={isClosed || isUploadingImage || pendingImages.length >= 4}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 shrink-0 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={!ticket || isClosed || isUploadingImage || pendingImages.length >= 4}
              title="Attach image"
            >
              <ImageIcon className="size-3.5" />
            </Button>
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder={
                isClosed
                  ? "This ticket is closed"
                  : "Send a message… (Enter to send)"
              }
              className="max-h-32 bg-transparent h-full flex-1 resize-none p-2 rounded-sm text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
              disabled={
                !ticket || isClosed || createTicketMessageMutation.isPending
              }
            />
            <Button
              type="button"
              size="icon-sm"
              className="size-7 shrink-0"
              onClick={() => void handleSendMessage()}
              disabled={
                !ticket || isClosed || createTicketMessageMutation.isPending || isUploadingImage
              }
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Customer review dialog — shown when ticket closes */}
      <ReviewDialog
        open={reviewOpen}
        title="How did we do?"
        description="Rate your support experience for this ticket."
        isSubmitting={submitReviewMutation.isPending}
        onSubmit={(rating, comment) => void handleSubmitReview(rating, comment)}
        onSkip={() => setReviewOpen(false)}
      />
    </div>
  );
}

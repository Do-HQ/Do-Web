"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Gem, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import useWorkspaceAi from "@/hooks/use-workspace-ai";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import { ROUTES } from "@/utils/constants";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent } from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar";

const INITIAL_LIMIT = 6;
const LIMIT_STEP = 6;

const formatRelativeTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "now";
  }
  if (diffMs < hour) {
    return `${Math.max(1, Math.round(diffMs / minute))}m`;
  }
  if (diffMs < day) {
    return `${Math.max(1, Math.round(diffMs / hour))}h`;
  }

  return `${Math.max(1, Math.round(diffMs / day))}d`;
};

export function NavAskSquircle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const { useWorkspaceAiChats, useCreateWorkspaceAiChat, useDeleteWorkspaceAiChat } =
    useWorkspaceAi();

  const [open, setOpen] = useState(pathname.startsWith(ROUTES.ASK_SQUIRCLE));
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const activeChatId =
    pathname.startsWith(ROUTES.ASK_SQUIRCLE) && searchParams
      ? String(searchParams.get("chat") || "")
      : "";

  const chatsQuery = useWorkspaceAiChats(
    normalizedWorkspaceId,
    {
      page: 1,
      limit,
    },
    {
      enabled: !!normalizedWorkspaceId,
    },
  );

  const createChatMutation = useCreateWorkspaceAiChat();
  const deleteChatMutation = useDeleteWorkspaceAiChat();

  const chats = useMemo(
    () => chatsQuery.data?.data?.chats || [],
    [chatsQuery.data?.data?.chats],
  );
  const hasMore = Boolean(chatsQuery.data?.data?.pagination?.hasMore);

  const defaultChatId = useMemo(() => {
    if (activeChatId) {
      return activeChatId;
    }

    if (!chats.length) {
      return "";
    }

    return chats[0]?.chatId || "";
  }, [activeChatId, chats]);

  const askSquircleHref = defaultChatId
    ? `${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(defaultChatId)}`
    : ROUTES.ASK_SQUIRCLE;

  useEffect(() => {
    if (pathname.startsWith(ROUTES.ASK_SQUIRCLE)) {
      setOpen(true);
    }
  }, [pathname]);

  const handleCreateChat = async () => {
    if (!normalizedWorkspaceId || createChatMutation.isPending) {
      return;
    }

    const response = await createChatMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      payload: {},
    });

    const chatId = String(response?.data?.chat?.chatId || "").trim();
    await queryClient.invalidateQueries({
      queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
    });

    if (!chatId) {
      return;
    }

    setOpen(true);
    router.push(`${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(chatId)}`);
  };

  const handleDeleteChat = async (chatId: string) => {
    const normalizedChatId = String(chatId || "").trim();
    if (
      !normalizedWorkspaceId ||
      !normalizedChatId ||
      deleteChatMutation.isPending
    ) {
      return;
    }

    const remainingChats = chats.filter((chat) => chat.chatId !== normalizedChatId);
    const nextChatId = remainingChats[0]?.chatId || "";
    const request = deleteChatMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      chatId: normalizedChatId,
    });

    try {
      queryClient.setQueriesData(
        {
          queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
        },
        (current: unknown) => {
          if (!current || typeof current !== "object") {
            return current;
          }

          const response = current as {
            data?: { chats?: Array<Record<string, unknown>> };
          };
          const existingChats = Array.isArray(response?.data?.chats)
            ? response.data.chats
            : null;
          if (!existingChats) {
            return current;
          }

          return {
            ...(current as Record<string, unknown>),
            data: {
              ...(response.data || {}),
              chats: existingChats.filter(
                (entry) => String(entry?.chatId || "").trim() !== normalizedChatId,
              ),
            },
          };
        },
      );

      queryClient.removeQueries({
        queryKey: ["workspace-ai-chat-detail", normalizedWorkspaceId, normalizedChatId],
      });

      await toast.promise(request, {
        loading: "Deleting chat...",
        success: (response) =>
          response?.data?.message || "Chat deleted successfully.",
        error: "We could not delete this chat.",
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
        }),
      ]);

      if (activeChatId === normalizedChatId && pathname.startsWith(ROUTES.ASK_SQUIRCLE)) {
        if (nextChatId) {
          router.replace(
            `${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(nextChatId)}`,
          );
          return;
        }

        router.replace(ROUTES.ASK_SQUIRCLE);
      }
    } catch {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-ai-chats", normalizedWorkspaceId],
      });
    }
  };

  return (
    <SidebarMenu>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(ROUTES.ASK_SQUIRCLE)}
          >
            <Link href={askSquircleHref}>
              <Gem />
              <span>Scribe</span>
            </Link>
          </SidebarMenuButton>

          <SidebarMenuAction
            type="button"
            showOnHover
            aria-label={open ? "Collapse Scribe chats" : "Expand Scribe chats"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((current) => !current);
            }}
          >
            <ChevronRight
              className={cn("transition-transform", open && "rotate-90")}
            />
          </SidebarMenuAction>

          <CollapsibleContent>
            <SidebarMenuSub className="mt-1.5">
              <SidebarMenuSubItem className="mb-2">
                <SidebarMenuSubButton
                  href="#"
                  size="sm"
                  className="bg-sidebar-accent/45 border-sidebar-border/70 border"
                  onClick={(event) => {
                    event.preventDefault();
                    handleCreateChat();
                  }}
                  aria-disabled={
                    !normalizedWorkspaceId ||
                    createChatMutation.isPending ||
                    undefined
                  }
                >
                  <Plus />
                  <span>
                    {createChatMutation.isPending ? "Creating..." : "New chat"}
                  </span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>

              <SidebarMenuSubItem>
                <div className="border-sidebar-border/75 mx-1 border-t" />
              </SidebarMenuSubItem>

              {chatsQuery.isLoading ? (
                <>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <SidebarMenuSubItem key={`chat-loading-skeleton-${index + 1}`}>
                      <div className="space-y-1.5 px-2 py-1.5">
                        <Skeleton className="h-3 w-8/12 bg-sidebar-accent/40" />
                        <Skeleton className="h-2.5 w-11/12 bg-sidebar-accent/30" />
                      </div>
                    </SidebarMenuSubItem>
                  ))}
                </>
              ) : null}

              {chats.map((chat) => {
                const isActive = activeChatId === chat.chatId;
                const preview = chat.lastMessagePreview || "No messages yet";
                const lastSeen = formatRelativeTime(chat.lastMessageAt);

                return (
                  <SidebarMenuSubItem key={chat.chatId}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isActive}
                      size="sm"
                      className="h-auto min-h-8 items-start py-1.5 pr-8"
                    >
                      <Link
                        href={`${ROUTES.ASK_SQUIRCLE}?chat=${encodeURIComponent(chat.chatId)}`}
                      >
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[11px] font-medium">
                            {chat.title || "Untitled"}
                          </span>
                          <span className="text-sidebar-foreground/65 truncate text-[10px]">
                            {preview}
                          </span>
                        </span>
                        <span className="text-sidebar-foreground/55 ml-2 text-[10px]">
                          {lastSeen}
                        </span>
                      </Link>
                    </SidebarMenuSubButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-sidebar-foreground/60 hover:text-sidebar-foreground absolute top-1.5 right-1.5 size-5 rounded-md opacity-0 transition-opacity group-hover/menu-sub-item:opacity-100 data-[state=open]:opacity-100"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDeleteChat(chat.chatId);
                          }}
                          disabled={deleteChatMutation.isPending}
                        >
                          <Trash2 className="size-3.5" />
                          Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuSubItem>
                );
              })}

              {!chatsQuery.isLoading && chats.length < 1 ? (
                <SidebarMenuSubItem>
                  <p className="text-sidebar-foreground/60 px-2 py-1 text-[11px]">
                    No chats yet.
                  </p>
                </SidebarMenuSubItem>
              ) : null}

              {hasMore ? (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    href="#"
                    size="sm"
                    onClick={(event) => {
                      event.preventDefault();
                      setLimit((current) => current + LIMIT_STEP);
                    }}
                  >
                    <span>See more</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ) : null}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  );
}

"use client";

import { ChevronDown, Loader, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/utils/constants";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import useAuthStore from "@/stores/auth";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";

export function TeamSwitcher() {
  const queryClient = useQueryClient();

  // Store
  const { user } = useAuthStore();
  const { workspaceId, setWorkspaceId, workspaces } = useWorkspaceStore();

  // Router
  const router = useRouter();

  // Hooks
  const { useSwitchWorkspace } = useWorkspace();
  const { isPending: isSwitchingWorkspace, mutate: switchWorkspace } =
    useSwitchWorkspace({
      onSuccess(data) {
        router.replace(ROUTES.DASHBOARD);
        setWorkspaceId(data?.data?.workspace?._id);
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });
      },
    });

  // Handlers
  const handleCreateWorkspace = () => {
    router.push(ROUTES.CREATE_WORKSPACE);
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    switchWorkspace({ workspaceId });
  };

  const currentWorkspaceName = user?.currentWorkspaceId?.name || "Workspace";
  const currentWorkspaceInitials =
    String(currentWorkspaceName)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase())
      .join("") || "WS";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full px-1.5">
              <Avatar
                size="sm"
                userCard={{
                  name: currentWorkspaceName,
                  role: "Workspace",
                  status: "Current workspace",
                }}
              >
                <AvatarImage
                  src={user?.currentWorkspaceId?.logo?.url}
                  alt={currentWorkspaceName}
                  className="rounded-md object-cover"
                />
                <AvatarFallback className="rounded-md">
                  {currentWorkspaceInitials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">
                {user?.currentWorkspaceId?.name}
              </span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 max-h-100 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {workspaces?.map((team, index) => {
              const workspaceInitials =
                String(team?.name || "")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((segment) => segment[0]?.toUpperCase())
                  .join("") || "WS";

              return (
                <DropdownMenuItem
                  key={team?._id}
                  onClick={() => handleSwitchWorkspace(team?._id)}
                  className={cn(
                    "gap-2 p-1.5 text-xs font-medium",
                    workspaceId === team?._id &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <Avatar
                    size="sm"
                    userCard={{
                      name: team?.name || "Workspace",
                      role: "Workspace",
                      status:
                        workspaceId === team?._id
                          ? "Current workspace"
                          : "Available",
                    }}
                  >
                    <AvatarImage
                      src={team?.logo?.url}
                      alt={team?.name || "Workspace"}
                      className="rounded-md object-cover"
                    />
                    <AvatarFallback>{workspaceInitials}</AvatarFallback>
                  </Avatar>
                  {team?.name}
                  <DropdownMenuShortcut>
                    {isSwitchingWorkspace && workspaceId === team?._id ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      <>⌘{index + 1}</>
                    )}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-1.5"
              onClick={handleCreateWorkspace}
            >
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground text-sm font-medium">
                Add workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

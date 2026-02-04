"use client";

import * as React from "react";
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
import { UserWorkspace } from "@/types/auth";
import useAuth from "@/hooks/use-auth";
import useAuthStore from "@/stores/auth";
import { getUserAbbreviation } from "@/lib/helpers/return-full-name";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspace from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";

export function TeamSwitcher({ teams }: { teams: UserWorkspace[] }) {
  const queryClient = useQueryClient();

  // Store
  const { user } = useAuthStore();
  const { workspaceId, setWorkspaceId } = useWorkspaceStore();

  // Router
  const router = useRouter();

  // Hooks
  const { useSwitchWorkspace } = useWorkspace();
  const { isPending: isSwitchingWorkspace, mutate: switchWorkspace } =
    useSwitchWorkspace({
      onSuccess(data) {
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full px-1.5">
              <Avatar size="sm" className="rounded-full">
                <AvatarImage src={user?.profilePhoto?.url} alt="@shadcn" />
                <AvatarFallback>{getUserAbbreviation(user!)}</AvatarFallback>
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
            {teams?.map((team, index) => (
              <DropdownMenuItem
                key={team?.workspaceId?._id}
                onClick={() => handleSwitchWorkspace(team?.workspaceId?._id)}
                className={cn(
                  "gap-2 p-1.5 text-xs font-medium",
                  workspaceId === team?.workspaceId?._id &&
                    "bg-accent text-accent-foreground",
                )}
              >
                <Avatar size="sm" className="rounded-sm">
                  <AvatarImage
                    src="https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png"
                    alt="@shadcn"
                  />
                  <AvatarFallback>SQ</AvatarFallback>
                </Avatar>
                {team?.workspaceId?.name}
                <DropdownMenuShortcut>
                  {isSwitchingWorkspace &&
                  workspaceId === team?.workspaceId?._id ? (
                    <Loader className="animate-spin" size={16} />
                  ) : (
                    <>⌘{index + 1}</>
                  )}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
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

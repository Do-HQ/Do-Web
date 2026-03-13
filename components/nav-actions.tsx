"use client";

import * as React from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Settings2,
  UserCircle,
} from "lucide-react";

import useAuthStore from "@/stores/auth";
import { useAppStore } from "@/stores";
import LogoutModal from "@/components/modals/logout";
import { WorkspaceNotificationsPopover } from "@/components/notifications/workspace-notifications-popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

const getInitials = (firstName?: string, lastName?: string, email?: string) => {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  const combined = `${first} ${last}`.trim();

  if (combined) {
    return combined
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || "")
      .join("");
  }

  return String(email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
};

export function NavActions() {
  const { user } = useAuthStore();
  const { setShowSpotlightSearch, setShowSettings, setActiveSetting } =
    useAppStore();

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const userName = `${String(user?.firstName || "").trim()} ${String(
    user?.lastName || "",
  )
    .trim()}`
    .trim() || "My profile";
  const userEmail = String(user?.email || "").trim();
  const userRole = "Workspace member";
  const avatarUrl = String(user?.profilePhoto?.url || "").trim();
  const initials = getInitials(user?.firstName, user?.lastName, userEmail);

  const openSettings = React.useCallback(
    (section: string) => {
      setActiveSetting(section);
      setShowSettings(true);
    },
    [setActiveSetting, setShowSettings],
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 w-9 justify-center px-0 text-[12px] font-normal sm:w-[15.75rem] sm:justify-between sm:px-2.5"
          onClick={() => setShowSpotlightSearch(true)}
          aria-label="Open search"
        >
          <span className="hidden items-center gap-2 text-muted-foreground sm:inline-flex">
            <Search className="size-3.5" />
            Search for anything...
          </span>
          <Search className="size-4 text-muted-foreground sm:hidden" />
          <InputGroupAddon align="inline-end" className="hidden sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </InputGroupAddon>
        </Button>

        <WorkspaceNotificationsPopover />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 gap-1.5 rounded-md px-1.5"
            >
              <Avatar
                size="sm"
                userCard={{
                  name: userName,
                  email: userEmail,
                  role: userRole,
                }}
              >
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-1.5">
            <DropdownMenuLabel className="px-2 py-1.5">
              <div className="flex items-center gap-2.5">
                <Avatar
                  size="default"
                  userCard={{
                    name: userName,
                    email: userEmail,
                    role: userRole,
                  }}
                >
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={userName} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold">
                    {userName}
                  </div>
                  <div className="text-muted-foreground truncate text-[11px] font-normal">
                    {userEmail}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                className="h-8 text-[12px]"
                onClick={() => openSettings("profile")}
              >
                <UserCircle className="size-3.5" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-8 text-[12px]"
                onClick={() => openSettings("notifications")}
              >
                <Bell className="size-3.5" />
                Notifications
                <Badge
                  variant="outline"
                  className="ml-auto h-5 rounded-md px-1.5 text-[10px]"
                >
                  Manage
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-8 text-[12px]"
                onClick={() => openSettings("workspaces")}
              >
                <Settings2 className="size-3.5" />
                Workspace settings
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="h-8 text-[12px]"
              onClick={() => setShowLogoutModal(true)}
            >
              <LogOut className="size-3.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LogoutModal open={showLogoutModal} onOpenChange={setShowLogoutModal} />
    </>
  );
}

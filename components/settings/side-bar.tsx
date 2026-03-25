import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { shouldShowProfileCompletionIndicator } from "@/lib/helpers/profile-completion";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useAuthStore from "@/stores/auth";
import { useAppStore } from "@/stores";
import { LogOut, LucideIcon } from "lucide-react";
import { useState } from "react";
import LogoutModal from "../modals/logout";

interface Props {
  workspace: { nav: { name: string; icon: LucideIcon }[] };
  profile: { nav: { name: string; icon: LucideIcon }[] };
}

const toTourSlug = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const SettingsSideBar = ({ workspace, profile }: Props) => {
  // Store
  const { setActiveSetting, activeSetting } = useAppStore();
  const { user } = useAuthStore();
  const { isAdminLike } = useWorkspacePermissions();

  // States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const showProfileCompletionIndicator = shouldShowProfileCompletionIndicator(user);

  const canAccessWorkspaceSetting = (settingName: string) => {
    const normalized = settingName.toLowerCase();

    if (
      normalized.includes("automation") ||
      normalized === "security" ||
      normalized === "onboarding" ||
      normalized === "import"
    ) {
      return isAdminLike;
    }

    return true;
  };

  return (
    <Sidebar
      collapsible="none"
      className="hidden md:flex"
      data-tour="settings-modal-nav"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Profile</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {profile.nav.map((item) => (
                <SidebarMenuItem
                  key={item.name}
                  onClick={() => {
                    setActiveSetting(item?.name?.toLowerCase());
                  }}
                >
                  <SidebarMenuButton
                    asChild
                    isActive={item.name?.toLowerCase() === activeSetting}
                  >
                    <a href="#" data-tour={`settings-nav-${toTourSlug(item.name)}`}>
                      <item.icon />
                      <span className="inline-flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.name.toLowerCase() === "profile" &&
                        showProfileCompletionIndicator ? (
                          <span
                            className="inline-flex size-2 rounded-full bg-primary/70 ring-1 ring-primary/35"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspace.nav.map((item) => (
                // Keep visible for members, but lock interaction for admin-only sections.
                <SidebarMenuItem
                  key={item.name}
                  onClick={() => {
                    if (!canAccessWorkspaceSetting(item.name)) {
                      return;
                    }
                    setActiveSetting(item?.name?.toLowerCase());
                  }}
                >
                  <SidebarMenuButton
                    asChild
                    isActive={item.name?.toLowerCase() === activeSetting}
                    className={
                      canAccessWorkspaceSetting(item.name)
                        ? undefined
                        : "cursor-not-allowed opacity-55"
                    }
                  >
                    <a href="#" data-tour={`settings-nav-${toTourSlug(item.name)}`}>
                      <item.icon />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Authentication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setShowLogoutModal(true)}>
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <LogoutModal onOpenChange={setShowLogoutModal} open={showLogoutModal} />
    </Sidebar>
  );
};

export default SettingsSideBar;

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
import { useAppStore } from "@/stores";
import { LogOut, LucideIcon } from "lucide-react";
import { useState } from "react";
import LogoutModal from "../modals/logout";

interface Props {
  workspace: { nav: { name: string; icon: LucideIcon }[] };
  profile: { nav: { name: string; icon: LucideIcon }[] };
}

const SettingsSideBar = ({ workspace, profile }: Props) => {
  // Store
  const { setActiveSetting, activeSetting } = useAppStore();

  // States
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <Sidebar collapsible="none" className="hidden md:flex">
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
                    <a href="#">
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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspace.nav.map((item) => (
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
                    <a href="#">
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

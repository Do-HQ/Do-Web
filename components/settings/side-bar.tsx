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
import { LucideIcon } from "lucide-react";

interface Props {
  workspace: { nav: { name: string; icon: LucideIcon }[] };
  profile: { nav: { name: string; icon: LucideIcon }[] };
}

const SettingsSideBar = ({ workspace, profile }: Props) => {
  // Store
  const { setActiveSetting, activeSetting } = useAppStore();

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
      </SidebarContent>
    </Sidebar>
  );
};

export default SettingsSideBar;

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAppStore } from "@/stores";
import SettingsSideBar from "../settings/side-bar";
import { H2 } from "../ui/typography";
import SettingsWorkspaceOverview from "../settings/settings-workspace-overview";
import { ScrollArea } from "../ui/scroll-area";
import SettingsWorkspaceTeams from "../settings/settings-worpskace-teams";
import {
  Baby,
  BellDotIcon,
  Blocks,
  Building2,
  CircleSmall,
  Cog,
  FolderInput,
  Library,
  MessageCircle,
  Shield,
  SunMoon,
  ToyBrick,
  User2Icon,
  UserCog,
  Workflow,
} from "lucide-react";
import SettingsProfileReferences from "../settings/settings-profile-preferences";
import SettingsWorkspacePeople from "../settings/settings-worpspace-people";

const workspace = {
  nav: [
    { name: "Overview", icon: CircleSmall },
    { name: "People", icon: UserCog },
    { name: "Teams", icon: Baby },
    { name: "Automation ⭐️", icon: Workflow },
    { name: "Security", icon: Shield },
    { name: "Appearance", icon: SunMoon },
    { name: "Knowledge Base", icon: Library },
    { name: "Integrations", icon: ToyBrick },
    { name: "Import", icon: FolderInput },
  ],
};

const profile = {
  nav: [
    { name: "Profile", icon: User2Icon },
    { name: "Notifications", icon: BellDotIcon },
    { name: "Preferences", icon: Cog },
    { name: "Workspaces", icon: Building2 },
    { name: "Integrations", icon: Blocks },
  ],
};

const SettingsModal = () => {
  // Store
  const { showSettings, setShowSettings, activeSetting } = useAppStore();

  const renderComponent = (id: string) => {
    if (id === "overview") {
      return <SettingsWorkspaceOverview />;
    } else if (id === "teams") {
      return <SettingsWorkspaceTeams />;
    } else if (id === "preferences") {
      return <SettingsProfileReferences />;
    } else if (id === "people") {
      return <SettingsWorkspacePeople />;
    } else {
      return null;
    }
  };

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="overflow-hidden p-0 md:max-h-205 md:max-w-275 lg:max-w-270">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <SettingsSideBar workspace={workspace} profile={profile} />
          <main className="flex h-205 flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-8">
                <H2 className="font-semibold capitalize">{activeSetting}</H2>
              </div>
            </header>
            <ScrollArea className="overflow-auto">
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-8 pt-4 pb-12">
                {renderComponent(activeSetting)}
              </div>
            </ScrollArea>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;

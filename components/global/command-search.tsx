"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Archive,
  BellIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  HelpCircleIcon,
  HomeIcon,
  InboxIcon,
  PlusIcon,
  SettingsIcon,
  Terminal,
  UserIcon,
} from "lucide-react";
import { useAppStore } from "@/stores";
import { useHotkeys } from "react-hotkeys-hook";

const CommandSearch = () => {
  //   Store
  const { showSpotlightSearch, setShowSpotlightSearch } = useAppStore();

  const [search, setSearch] = React.useState("");
  useHotkeys("meta+k", () => setShowSpotlightSearch(true), [
    showSpotlightSearch,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <CommandDialog
        open={showSpotlightSearch}
        onOpenChange={setShowSpotlightSearch}
      >
        <Command autoFocus>
          <CommandInput
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              No results found for &quot;{search}&quot;.
            </CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem>
                <HomeIcon />
                <span>Home</span>
                <CommandShortcut>⌘H</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <InboxIcon />
                <span>Spaces</span>
                <CommandShortcut>⌘C</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <FileTextIcon />
                <span>Projects</span>
                <CommandShortcut>⌘D</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <FolderIcon />
                <span>Teams</span>
                <CommandShortcut>⌘F</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem>
                <PlusIcon />
                <span>New Project</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <FolderPlusIcon />
                <span>New Space</span>
                <CommandShortcut>⇧⌘N</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Squircle AI Quick Prompts">
              <CommandItem>
                <Terminal />
                <span>Summarise what&apos;s in current view</span>
              </CommandItem>
              <CommandItem>
                <Terminal />
                <span>What do timelines look like for :Project name</span>
              </CommandItem>
              <CommandItem>
                <Terminal />
                <span>Estimate completion date</span>
              </CommandItem>
              <CommandItem>
                <Terminal />
                <span>Suggest improvements</span>
              </CommandItem>
              <CommandItem>
                <Terminal />
                <span>What’s the fastest path to completion?</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem>
                <UserIcon />
                <span>Profile</span>
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <CreditCardIcon />
                <span>Billing</span>
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <SettingsIcon />
                <span>Settings</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <BellIcon />
                <span>Notifications</span>
              </CommandItem>
              <CommandItem>
                <HelpCircleIcon />
                <span>Help & Support</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tools">
              <CommandItem>
                <Archive />
                <span>Archive</span>
              </CommandItem>
              <CommandItem>
                <CalendarIcon />
                <span>Calendar</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
};

export default CommandSearch;

import * as React from "react";
import {
  Star,
  UserCircle,
  CreditCard,
  LogOut,
  BellIcon,
  SearchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Kbd } from "./ui/kbd";
import { useAppStore } from "@/stores";

const data = [
  [
    {
      label: "Account",
      icon: UserCircle,
    },
    {
      label: "Billing",
      icon: CreditCard,
    },
    {
      label: "Notifications",
      icon: BellIcon,
    },
  ],
  [
    {
      label: "Logout",
      icon: LogOut,
    },
  ],
];

export function NavActions() {
  const [isOpen, setIsOpen] = React.useState(false);

  // Store
  const { setShowSpotlightSearch } = useAppStore();
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex w-full max-w-xs flex-col gap-6">
        <Button
          className="w-70 justify-between"
          size="sm"
          variant="outline"
          onClick={() => setShowSpotlightSearch(true)}
        >
          <span>Search for anything...</span>
          <InputGroupAddon align="inline-end">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </InputGroupAddon>
        </Button>
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-accent h-7 w-7"
          >
            <Avatar size="sm">
              <AvatarImage
                src="https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png"
                alt="@shadcn"
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              <SidebarGroup className="border-b last:border-none">
                <SidebarGroupContent className="gap-0">
                  <SidebarMenuItem>
                    <SidebarMenuButton className="py-6">
                      <div className="flex items-center gap-2 px-0  text-left text-sm ">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src="https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png"
                            alt="@volfgng"
                          />
                          <AvatarFallback className="rounded-lg">
                            VG
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">
                            Tobe Squircle
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            tobe@squircle.com
                          </span>
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarGroupContent>
              </SidebarGroup>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, i) => (
                        <SidebarMenuItem key={i}>
                          <SidebarMenuButton>
                            <item.icon /> <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}

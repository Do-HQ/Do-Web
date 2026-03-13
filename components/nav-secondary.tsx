import React from "react";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    badge?: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    disabled?: boolean;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            if (item?.onClick) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    aria-disabled={item.disabled || undefined}
                    className={item.disabled ? "cursor-not-allowed opacity-50" : undefined}
                    onClick={() => {
                      if (item.disabled) {
                        return;
                      }

                      item.onClick?.();
                    }}
                  >
                    <div>
                      <item.icon />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            } else {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    aria-disabled={item.disabled || undefined}
                    className={item.disabled ? "cursor-not-allowed opacity-50" : undefined}
                  >
                    <Link
                      href={item?.url}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                        }
                      }}
                      tabIndex={item.disabled ? -1 : undefined}
                      aria-disabled={item.disabled || undefined}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            }
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

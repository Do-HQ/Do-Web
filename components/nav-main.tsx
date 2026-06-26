import { type LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    badge?: number;
  }[];
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={item.isActive}
            aria-disabled={item.disabled || undefined}
            className={item.disabled ? "cursor-not-allowed opacity-50" : undefined}
          >
            <Link
              href={item.url}
              onClick={(event) => {
                if (item.disabled) {
                  event.preventDefault();
                  return;
                }

                if (!item.onClick) {
                  return;
                }

                event.preventDefault();
                item.onClick();
              }}
              tabIndex={item.disabled ? -1 : undefined}
              aria-disabled={item.disabled || undefined}
            >
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
          {item.badge ? (
            <SidebarMenuBadge className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-semibold">
              {item.badge > 99 ? "99+" : item.badge}
            </SidebarMenuBadge>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

"use client";

import * as React from "react";
import {
  Archive,
  Calendar,
  Home,
  Inbox,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

import { NavFavorites } from "@/components/nav-favorites";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavProjects } from "@/components/nav-projects";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAppStore } from "@/stores";
import SettingsModal from "./modals/settings-modal";
import useAuthStore from "@/stores/auth";
import { UserWorkspace } from "@/types/auth";
import { ROUTES } from "@/utils/constants";
import { usePathname } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Stores
  const { setShowSettings } = useAppStore();
  const { user } = useAuthStore();
  const pathname = usePathname();

  const data = {
    teams: [
      {
        name: "Tobe's Workspace",
        logo: "https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png",
        plan: "Enterprise",
      },
      {
        name: "Kizito's Workspace",
        logo: "https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png",
        plan: "Startup",
      },
      {
        name: "Test Workspace",
        logo: "https://res.cloudinary.com/dgiropjpp/image/upload/v1769577491/Logo_maker_project-2_jz4e09.png",
        plan: "Free",
      },
    ],
    navMain: [
      {
        title: "Search",
        url: "#",
        icon: Search,
      },
      {
        title: "Ask Squircle",
        url: ROUTES.ASK_SQUIRCLE,
        icon: Sparkles,
        isActive: pathname === ROUTES.ASK_SQUIRCLE,
      },
      {
        title: "Home",
        url: ROUTES.DASHBOARD,
        icon: Home,
        isActive: pathname === ROUTES.DASHBOARD,
      },
      {
        title: "Spaces",
        url: ROUTES.SPACES,
        icon: Inbox,
        badge: "10",
        isActive: pathname.startsWith(ROUTES.SPACES),
      },
    ],
    navSecondary: [
      {
        title: "Calendar",
        url: "#",
        icon: Calendar,
        onClick: () => {},
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        onClick: () => setShowSettings(true),
      },
      {
        title: "Archive",
        url: "#",
        icon: Archive,
        onClick: () => {},
      },
      {
        title: "Help & Support",
        url: "#",
        icon: MessageCircleQuestion,
        onClick: () => {},
      },
    ],
    favorites: [
      {
        name: "The Big Squircle Project.",
        url: "#",
        emoji: "📊",
      },
      {
        name: "Family Recipe Collection & Meal Planning",
        url: "#",
        emoji: "🍳",
      },
      {
        name: "Fitness Tracker & Workout Routines",
        url: "#",
        emoji: "💪",
      },
      {
        name: "Book Notes & Reading List",
        url: "#",
        emoji: "📚",
      },
      {
        name: "Sustainable Gardening Tips & Plant Care",
        url: "#",
        emoji: "🌱",
      },
    ],
    projects: [
      {
        name: "Personal Life Management",
        emoji: "🏠",
        pages: [
          {
            name: "Daily Journal & Reflection",
            url: "#",
            emoji: "📔",
          },
          {
            name: "Health & Wellness Tracker",
            url: "#",
            emoji: "🍏",
          },
          {
            name: "Personal Growth & Learning Goals",
            url: "#",
            emoji: "🌟",
          },
        ],
      },
      {
        name: "Professional Development",
        emoji: "💼",
        pages: [
          {
            name: "Career Objectives & Milestones",
            url: "#",
            emoji: "🎯",
          },
          {
            name: "Skill Acquisition & Training Log",
            url: "#",
            emoji: "🧠",
          },
          {
            name: "Networking Contacts & Events",
            url: "#",
            emoji: "🤝",
          },
        ],
      },
      {
        name: "Creative Projects",
        emoji: "🎨",
        pages: [
          {
            name: "Writing Ideas & Story Outlines",
            url: "#",
            emoji: "✍️",
          },
          {
            name: "Art & Design Portfolio",
            url: "#",
            emoji: "🖼️",
          },
          {
            name: "Music Composition & Practice Log",
            url: "#",
            emoji: "🎵",
          },
        ],
      },
      {
        name: "Home Management",
        emoji: "🏡",
        pages: [
          {
            name: "Household Budget & Expense Tracking",
            url: "#",
            emoji: "💰",
          },
          {
            name: "Home Maintenance Schedule & Tasks",
            url: "#",
            emoji: "🔧",
          },
          {
            name: "Family Calendar & Event Planning",
            url: "#",
            emoji: "📅",
          },
        ],
      },
      {
        name: "Travel & Adventure",
        emoji: "🧳",
        pages: [
          {
            name: "Trip Planning & Itineraries",
            url: "#",
            emoji: "🗺️",
          },
          {
            name: "Travel Bucket List & Inspiration",
            url: "#",
            emoji: "🌎",
          },
          {
            name: "Travel Journal & Photo Gallery",
            url: "#",
            emoji: "📸",
          },
        ],
      },
    ],
  };

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={user?.workspaces as UserWorkspace[]} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavFavorites favorites={data.favorites} />
        <NavProjects workspaces={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />

      <SettingsModal />
    </Sidebar>
  );
}

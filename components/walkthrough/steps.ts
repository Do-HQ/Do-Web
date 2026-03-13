import type { DriveStep } from "driver.js";

export type WalkthroughSection =
  | "dashboard"
  | "spaces"
  | "projects"
  | "calendar"
  | "jams"
  | "jam-canvas";

export const WALKTHROUGH_VERSION = 1;

export const WALKTHROUGH_STEPS: Record<WalkthroughSection, DriveStep[]> = {
  dashboard: [
    {
      element: "[data-tour='dashboard-hero']",
      popover: {
        title: "Workspace pulse",
        description:
          "This top block gives your daily snapshot, plus quick actions to create projects or jump to Spaces and Calendar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='dashboard-focus']",
      popover: {
        title: "My focus queue",
        description:
          "Tasks assigned to you are prioritized here so you can execute quickly from one list.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='dashboard-upcoming']",
      popover: {
        title: "Upcoming schedule",
        description:
          "Deadlines, milestones, and workflow targets are grouped here so you can stay ahead of project timelines.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='dashboard-keepup']",
      popover: {
        title: "Keep up",
        description:
          "Unread mentions and thread highlights appear here. Open any item to jump straight into the conversation.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='dashboard-risks']",
      popover: {
        title: "Projects at risk",
        description:
          "Use this panel to monitor projects that need attention and jump directly to the affected project.",
        side: "top",
        align: "start",
      },
    },
  ],
  spaces: [
    {
      element: "[data-tour='spaces-list']",
      popover: {
        title: "Chat spaces",
        description:
          "All your direct, project, workflow, and task chats live here. Use search to find rooms faster.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='spaces-create']",
      popover: {
        title: "Create chat",
        description:
          "Start a direct message or group room from here.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='spaces-chat']",
      popover: {
        title: "Active conversation",
        description:
          "The center panel shows messages, call controls, and room context. Select any room to switch instantly.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='spaces-composer']",
      popover: {
        title: "Message composer",
        description:
          "Send text, upload images, and mention teammates with @ from this composer.",
        side: "top",
        align: "start",
      },
    },
  ],
  projects: [
    {
      element: "[data-tour='project-summary']",
      popover: {
        title: "Project summary",
        description:
          "This section gives quick project context. You can collapse it when you need a tighter working area.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Switch between Overview, Workflows, Do's, Files, Risks, Secrets, and Agent controls here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-overview-workflows']",
      popover: {
        title: "Workflow table",
        description:
          "Manage workflows, expand tasks, and trigger create/edit actions from this table.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-overview-risks']",
      popover: {
        title: "Operational signals",
        description:
          "Track risks and recent activity here, then drill into details when intervention is needed.",
        side: "top",
        align: "start",
      },
    },
  ],
  calendar: [
    {
      element: "[data-tour='calendar-sidebar']",
      popover: {
        title: "Calendar filters",
        description:
          "Use project/type filters and the mini calendar to control what appears on the main timeline.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='calendar-view-switch']",
      popover: {
        title: "Calendar modes",
        description:
          "Switch between Day, Week, Month, Year, and Agenda views from this control.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='calendar-surface']",
      popover: {
        title: "Main schedule view",
        description:
          "This area renders the selected calendar mode and timeline data across your workspace.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='calendar-upcoming']",
      popover: {
        title: "Upcoming events",
        description:
          "Use this list for quick navigation to the next tasks, milestones, workflows, and risks.",
        side: "right",
        align: "center",
      },
    },
  ],
  jams: [
    {
      element: "[data-tour='jams-header']",
      popover: {
        title: "Jams workspace",
        description:
          "Search, filter, and manage all jamboards for your workspace from this header.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='jams-new']",
      popover: {
        title: "Create a jam",
        description:
          "Use this button to open a new jam and start whiteboarding immediately.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='jams-grid']",
      popover: {
        title: "Jam library",
        description:
          "Each card is a jam you can open, rename, share, archive, or restore.",
        side: "top",
        align: "start",
      },
    },
  ],
  "jam-canvas": [
    {
      element: "[data-tour='jam-canvas-surface']",
      popover: {
        title: "Canvas mode",
        description:
          "This is your full drawing surface. Changes auto-save while you work.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='jam-canvas-snap']",
      popover: {
        title: "Snap controls",
        description:
          "Toggle snap mode to align elements more precisely on the canvas.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='jam-canvas-panel-toggle']",
      popover: {
        title: "Discussion and history",
        description:
          "Open this panel to review activity and discuss work with mentions.",
        side: "left",
        align: "center",
      },
    },
  ],
};


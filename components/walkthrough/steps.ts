import type { DriveStep } from "driver.js";

export type WalkthroughSection =
  | "dashboard"
  | "spaces"
  | "support"
  | "support-admin"
  | "support-thread"
  | "support-admin-thread"
  | "projects-overview"
  | "projects-workflows"
  | "projects-dos"
  | "projects-files-assets"
  | "projects-risks-issues"
  | "projects-secrets"
  | "projects-agents-automation"
  | "calendar"
  | "jams"
  | "jam-canvas"
  | "docs-index"
  | "docs-editor"
  | "knowledge-base"
  | "portfolio"
  | "templates"
  | "archive"
  | "settings"
  | "settings-profile"
  | "settings-notifications"
  | "settings-preferences"
  | "settings-workspaces"
  | "settings-integrations"
  | "settings-overview"
  | "settings-people"
  | "settings-teams"
  | "settings-security"
  | "settings-knowledge-base"
  | "settings-import";

export const WALKTHROUGH_VERSION = 2;

export const SETTINGS_WALKTHROUGH_SECTIONS: WalkthroughSection[] = [
  "settings",
  "settings-profile",
  "settings-notifications",
  "settings-preferences",
  "settings-workspaces",
  "settings-integrations",
  "settings-overview",
  "settings-people",
  "settings-teams",
  "settings-security",
  "settings-knowledge-base",
  "settings-import",
];

const buildSettingsSteps = (
  label: string,
  navTourId: string,
  sectionTourId: string,
  sectionDescription: string,
): DriveStep[] => [
  {
    element: "[data-tour='settings-modal-shell']",
    popover: {
      title: "Settings workspace",
      description:
        "This modal is where workspace and personal controls are managed without leaving your current page.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='settings-modal-nav']",
    popover: {
      title: "Settings navigation",
      description:
        "Switch between profile and workspace sections from this sidebar.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `[data-tour='${navTourId}']`,
    popover: {
      title: `${label} section`,
      description: `This nav item opens ${label.toLowerCase()} controls.`,
      side: "right",
      align: "center",
    },
  },
  {
    element: "[data-tour='settings-modal-content']",
    popover: {
      title: "Section workspace",
      description:
        "Each section loads inside this scroll area so you can configure settings in place.",
      side: "left",
      align: "start",
    },
  },
  {
    element: `[data-tour='${sectionTourId}']`,
    popover: {
      title: label,
      description: sectionDescription,
      side: "top",
      align: "start",
    },
  },
];

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
  support: [
    {
      element: "[data-tour-id='support-shell']",
      popover: {
        title: "Help and support",
        description:
          "Create tickets, track updates, and resolve workspace issues from this support hub.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour-id='support-ticket-form']",
      popover: {
        title: "Create ticket",
        description:
          "Describe the issue clearly with category and priority so support can triage faster.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour-id='support-knowledge-base']",
      popover: {
        title: "Quick knowledge search",
        description:
          "Search curated help content before raising a ticket to unblock faster.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour-id='support-ticket-list']",
      popover: {
        title: "Ticket list",
        description:
          "Review status, priority, and ownership, then open a ticket thread for detailed replies.",
        side: "top",
        align: "start",
      },
    },
  ],
  "support-admin": [
    {
      element: "[data-tour-id='support-shell']",
      popover: {
        title: "Support admin queue",
        description:
          "Internal operators manage queue health, response quality, and assignment from this view.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour-id='support-ticket-list']",
      popover: {
        title: "Queue control",
        description:
          "Filter by status and priority, assign owners, and move tickets through resolution states.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour-id='support-ticket-thread']",
      popover: {
        title: "Active thread panel",
        description:
          "Reply with customers and maintain internal notes inside the ticket context.",
        side: "left",
        align: "start",
      },
    },
  ],
  "support-thread": [
    {
      element: "[data-tour-id='support-ticket-thread-page']",
      popover: {
        title: "Ticket conversation",
        description:
          "This dedicated thread view keeps one support issue focused until it is resolved.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "support-admin-thread": [
    {
      element: "[data-tour-id='support-ticket-thread-page']",
      popover: {
        title: "Admin thread workspace",
        description:
          "Internal operators can review details, update status, and coordinate responses from this thread.",
        side: "bottom",
        align: "start",
      },
    },
  ],
  "projects-overview": [
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
  "projects-workflows": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Use these tabs to move between overview, workflows, do's, files, risks, secrets, and automation.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-workflows']",
      popover: {
        title: "Workflows tab",
        description:
          "This tab manages workflow timelines, task rollups, and workflow row actions.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-workflows-table']",
      popover: {
        title: "Workflow execution table",
        description:
          "Expand workflows, manage tasks/subtasks, and run workflow actions from this table.",
        side: "top",
        align: "start",
      },
    },
  ],
  "projects-dos": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Project tabs stay sticky so you can switch surfaces without losing context.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-dos']",
      popover: {
        title: "Do's workspace",
        description:
          "This is your execution surface for Kanban, table, and timeline-style task tracking.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-dos-controls']",
      popover: {
        title: "Task filters and actions",
        description:
          "Filter by status, team, assignee scope, date, and create new tasks from here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-dos-kanban']",
      popover: {
        title: "Kanban movement",
        description:
          "Drag tasks between sections. Status changes sync to all project views.",
        side: "top",
        align: "start",
      },
    },
  ],
  "projects-files-assets": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Open Files & Assets to manage uploads, previews, Drive imports, and sharing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-files-assets']",
      popover: {
        title: "Files & assets tab",
        description:
          "Upload files, import from Drive, and manage attached resources for this project.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-files-controls']",
      popover: {
        title: "File controls",
        description:
          "Search, filter, upload, and import files from this control row.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-files-list']",
      popover: {
        title: "Assets table",
        description:
          "Preview, download, replace, or delete files using row actions.",
        side: "top",
        align: "start",
      },
    },
  ],
  "projects-risks-issues": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Risks & Issues centralizes operational blockers and mitigation tracking.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-risks-issues']",
      popover: {
        title: "Risks & issues tab",
        description:
          "Capture, triage, and resolve risks or issues with comments and mentions.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-risks-controls']",
      popover: {
        title: "Risk filters",
        description:
          "Switch risk/issue view, filter severity and team scope, then create new records.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-risks-list']",
      popover: {
        title: "Risk register",
        description:
          "Open any row for details, comments, state updates, and action history.",
        side: "top",
        align: "start",
      },
    },
  ],
  "projects-secrets": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Use Secrets for protected keys and sensitive runtime values.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-secrets']",
      popover: {
        title: "Secrets tab",
        description:
          "Secrets are access-controlled and auditable. Team or member scope is enforced.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-secrets-controls']",
      popover: {
        title: "Secret controls",
        description:
          "Search, adjust secret rules, and create new secrets from this area.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-secrets-list']",
      popover: {
        title: "Secrets table",
        description:
          "Reveal (if permitted), copy, edit, and manage scoped visibility from row actions.",
        side: "top",
        align: "start",
      },
    },
  ],
  "projects-agents-automation": [
    {
      element: "[data-tour='project-tabs']",
      popover: {
        title: "Project sections",
        description:
          "Automation controls live under this project tab.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-tab-agents-automation']",
      popover: {
        title: "Automation hub",
        description:
          "Configure task reminders, meeting reminders, and execution settings for this project.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='project-agents-tabs']",
      popover: {
        title: "Automation sections",
        description:
          "Switch between deadlines, meetings, and run logs to manage automation behavior.",
        side: "bottom",
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
  "docs-index": [
    {
      element: "[data-tour='docs-index-shell']",
      popover: {
        title: "Docs workspace",
        description:
          "This is your workspace docs hub for discovery, ownership, and document operations.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='docs-index-sidebar']",
      popover: {
        title: "Doc views",
        description:
          "Switch between all docs, assigned docs, favorites, recent, and archived.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='docs-index-create']",
      popover: {
        title: "Create document",
        description:
          "Create a new workspace document from here and start editing instantly.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='docs-index-results']",
      popover: {
        title: "Document results",
        description:
          "Open, duplicate, archive, or delete docs using the result list actions.",
        side: "top",
        align: "start",
      },
    },
  ],
  "docs-editor": [
    {
      element: "[data-tour='docs-editor-shell']",
      popover: {
        title: "Document editor",
        description:
          "This view is optimized for focused writing with workspace-level ownership.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='docs-editor-header']",
      popover: {
        title: "Document header",
        description:
          "Rename from breadcrumb/title and access quick actions from this header.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='docs-editor-share']",
      popover: {
        title: "Share controls",
        description:
          "Manage visibility, permissions, and share links for this document.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='docs-editor-surface']",
      popover: {
        title: "Writing surface",
        description:
          "Use slash commands and rich blocks to build structured content.",
        side: "left",
        align: "start",
      },
    },
  ],
  "knowledge-base": [
    {
      element: "[data-tour='knowledge-base-shell']",
      popover: {
        title: "Knowledge base",
        description:
          "Centralized workspace knowledge with multi-pane exploration.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='knowledge-base-navigator']",
      popover: {
        title: "Navigator",
        description:
          "Use quick views, sources, and tags to narrow what you want to inspect.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='knowledge-base-articles']",
      popover: {
        title: "Article list",
        description:
          "Search and filter indexed knowledge articles in this middle pane.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='knowledge-base-detail']",
      popover: {
        title: "Knowledge insight",
        description:
          "Review content, confidence, and activity for the selected article.",
        side: "left",
        align: "start",
      },
    },
  ],
  portfolio: [
    {
      element: "[data-tour='portfolio-shell']",
      popover: {
        title: "Portfolio center",
        description:
          "Track cross-project execution through executive, health, velocity, dependency, capacity, and approvals views.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='portfolio-filters']",
      popover: {
        title: "Portfolio filters",
        description:
          "Scope analytics by project, team, and planning horizon.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='portfolio-tabs']",
      popover: {
        title: "Portfolio sections",
        description:
          "Switch between Executive, OKRs, Health, Velocity, Dependencies, Capacity, and Approvals.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='portfolio-capacity']",
      popover: {
        title: "Capacity planning",
        description:
          "Review utilization and update member overrides directly from this table.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='portfolio-approvals']",
      popover: {
        title: "Approval controls",
        description:
          "Manage approval policies and action requests for protected workflows.",
        side: "top",
        align: "start",
      },
    },
  ],
  templates: [
    {
      element: "[data-tour='templates-shell']",
      popover: {
        title: "Template library",
        description:
          "Create and manage reusable project/task templates for faster setup.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='templates-header']",
      popover: {
        title: "Template controls",
        description:
          "Switch kind, search templates, and create new templates from this header.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='templates-tabs']",
      popover: {
        title: "Template kinds",
        description:
          "Toggle between project templates and task templates.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='templates-grid']",
      popover: {
        title: "Template cards",
        description:
          "Use, edit, duplicate, or delete templates from card-level actions.",
        side: "top",
        align: "start",
      },
    },
  ],
  archive: [
    {
      element: "[data-tour='archive-shell']",
      popover: {
        title: "Archive center",
        description:
          "Restore archived projects, workflows, teams, and jams from one place.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='archive-controls']",
      popover: {
        title: "Archive controls",
        description:
          "Search archived content, review counts, and refresh records.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='archive-tabs']",
      popover: {
        title: "Archive sections",
        description:
          "Switch between archived projects, workflows, teams, and jams.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='archive-content']",
      popover: {
        title: "Restore list",
        description:
          "Use restore actions on rows or bulk-restore visible archived records.",
        side: "top",
        align: "start",
      },
    },
  ],
  settings: [
    {
      element: "[data-tour='settings-modal-shell']",
      popover: {
        title: "Settings workspace",
        description:
          "This modal is where workspace and personal controls are managed without leaving your current page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-modal-nav']",
      popover: {
        title: "Settings navigation",
        description:
          "Switch between profile and workspace sections from this sidebar. You only need this tour once for the whole settings flow.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-modal-header']",
      popover: {
        title: "Active section",
        description:
          "The current settings section title updates here so you always know which controls you are editing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-modal-content']",
      popover: {
        title: "Scrollable content",
        description:
          "Each section loads in this panel. You can scroll inside it without leaving the modal.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='settings-modal-section']",
      popover: {
        title: "Section controls",
        description:
          "This is where the inputs, toggles, and actions for the active section appear.",
        side: "top",
        align: "start",
      },
    },
  ],
  "settings-profile": buildSettingsSteps(
    "Profile",
    "settings-nav-profile",
    "settings-section-profile",
    "Manage personal profile details and identity-related preferences.",
  ),
  "settings-notifications": buildSettingsSteps(
    "Notifications",
    "settings-nav-notifications",
    "settings-section-notifications",
    "Control delivery channels, digest behavior, and activity notifications.",
  ),
  "settings-preferences": buildSettingsSteps(
    "Preferences",
    "settings-nav-preferences",
    "settings-section-preferences",
    "Configure personal UI and productivity defaults used across the app.",
  ),
  "settings-workspaces": buildSettingsSteps(
    "Workspaces",
    "settings-nav-workspaces",
    "settings-section-workspaces",
    "Review workspace directory and active workspace context.",
  ),
  "settings-integrations": buildSettingsSteps(
    "Integrations",
    "settings-nav-integrations",
    "settings-section-integrations",
    "Manage Slack, Google, GitHub, and external connectivity for the workspace.",
  ),
  "settings-overview": buildSettingsSteps(
    "Workspace overview",
    "settings-nav-overview",
    "settings-section-overview",
    "Update foundational workspace settings and operational metadata.",
  ),
  "settings-people": buildSettingsSteps(
    "Workspace people",
    "settings-nav-people",
    "settings-section-people",
    "Manage members, join requests, invites, and people-level actions.",
  ),
  "settings-teams": buildSettingsSteps(
    "Workspace teams",
    "settings-nav-teams",
    "settings-section-teams",
    "Configure team structures, membership, governance, and team operations.",
  ),
  "settings-security": buildSettingsSteps(
    "Workspace security",
    "settings-nav-security",
    "settings-section-security",
    "Control security posture, approval gates, and risk-sensitive policies.",
  ),
  "settings-knowledge-base": buildSettingsSteps(
    "Workspace knowledge base",
    "settings-nav-knowledge-base",
    "settings-section-knowledge-base",
    "Tune indexing, governance, and AI behavior for workspace knowledge.",
  ),
  "settings-import": buildSettingsSteps(
    "Workspace import",
    "settings-nav-import",
    "settings-section-import",
    "Configure import defaults and migration behavior for external data.",
  ),
};

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Github,
  HardDrive,
  Ellipsis,
  Link2,
  MessageCircle,
  Plus,
  Slack,
  TestTube2,
  Trash2,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import LoaderComponent from "../shared/loader";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceSlack from "@/hooks/use-workspace-slack";
import useWorkspaceGoogleCalendar from "@/hooks/use-workspace-google-calendar";
import useWorkspaceGoogleDrive from "@/hooks/use-workspace-google-drive";
import useWorkspaceGoogleChat from "@/hooks/use-workspace-google-chat";
import useWorkspaceGithub from "@/hooks/use-workspace-github";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type {
  SlackBindingEventType,
  WorkspaceGoogleChatSpaceBindingRecord,
  WorkspaceGoogleCalendarBindingRecord,
  WorkspaceSlackChannelBindingRecord,
} from "@/types/integration";

type SlackBindingDraft = Pick<
  WorkspaceSlackChannelBindingRecord,
  "channelId" | "channelName" | "eventTypes" | "enabled"
>;

type GoogleCalendarBindingDraft = Pick<
  WorkspaceGoogleCalendarBindingRecord,
  "calendarId" | "calendarName" | "colorId" | "isPrimary" | "enabled"
>;

type GoogleChatBindingDraft = Pick<
  WorkspaceGoogleChatSpaceBindingRecord,
  "spaceName" | "eventTypes" | "enabled" | "webhookPreview"
> & {
  webhookUrl?: string;
};

const SLACK_EVENT_FILTER_OPTIONS: Array<{
  value: SlackBindingEventType;
  label: string;
}> = [
  { value: "all", label: "All notifications" },
  { value: "task.assigned", label: "Task assigned" },
  { value: "task.reassigned", label: "Task reassigned" },
  { value: "risk.mentioned", label: "Risk mentions" },
  { value: "issue.mentioned", label: "Issue mentions" },
  { value: "team.mentioned", label: "Team mentions" },
  { value: "workflow.team.assigned", label: "Workflow team assignments" },
];

const formatDateLabel = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString();
};

const areBindingsEqual = (
  left: SlackBindingDraft[],
  right: SlackBindingDraft[],
) => {
  const normalize = (values: SlackBindingDraft[]) =>
    [...values]
      .map((value) => ({
        channelId: String(value.channelId || "").trim(),
        channelName: String(value.channelName || "").trim(),
        enabled: value.enabled !== false,
        eventTypes: Array.from(
          new Set(
            (Array.isArray(value.eventTypes) ? value.eventTypes : ["all"])
              .map((type) => String(type || "").trim())
              .filter(Boolean),
          ),
        ).sort(),
      }))
      .sort((a, b) => a.channelName.localeCompare(b.channelName));

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const areGoogleCalendarBindingsEqual = (
  left: GoogleCalendarBindingDraft[],
  right: GoogleCalendarBindingDraft[],
) => {
  const normalize = (values: GoogleCalendarBindingDraft[]) =>
    [...values]
      .map((value) => ({
        calendarId: String(value.calendarId || "").trim(),
        calendarName: String(value.calendarName || "").trim(),
        colorId: String(value.colorId || "").trim(),
        isPrimary: Boolean(value.isPrimary),
        enabled: value.enabled !== false,
      }))
      .sort((a, b) => a.calendarName.localeCompare(b.calendarName));

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const areGoogleChatBindingsEqual = (
  left: GoogleChatBindingDraft[],
  right: GoogleChatBindingDraft[],
) => {
  const normalize = (values: GoogleChatBindingDraft[]) =>
    [...values]
      .map((value) => ({
        spaceName: String(value.spaceName || "").trim(),
        enabled: value.enabled !== false,
        eventTypes: Array.from(
          new Set(
            (Array.isArray(value.eventTypes) ? value.eventTypes : ["all"])
              .map((type) => String(type || "").trim())
              .filter(Boolean),
          ),
        ).sort(),
      }))
      .sort((a, b) => a.spaceName.localeCompare(b.spaceName));

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const toSlackEventTypes = (eventTypes: unknown): SlackBindingEventType[] => {
  const allowed = new Set(
    SLACK_EVENT_FILTER_OPTIONS.map((option) => option.value),
  );

  const normalized = Array.from(
    new Set(
      (Array.isArray(eventTypes) ? eventTypes : ["all"])
        .map((value) => String(value || "").trim())
        .filter((value): value is SlackBindingEventType =>
          allowed.has(value as SlackBindingEventType),
        ),
    ),
  );

  return normalized.length ? normalized : ["all"];
};

const SettingsIntegrations = () => {
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const canManageIntegrations = Boolean(workspaceId) && canManageWorkspaceSettings;
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceSlackHook = useWorkspaceSlack();
  const workspaceGoogleCalendarHook = useWorkspaceGoogleCalendar();
  const workspaceGoogleDriveHook = useWorkspaceGoogleDrive();
  const workspaceGoogleChatHook = useWorkspaceGoogleChat();
  const workspaceGithubHook = useWorkspaceGithub();
  const workspaceProjectHook = useWorkspaceProject();

  const [channelSearch, setChannelSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [draftBindings, setDraftBindings] = useState<SlackBindingDraft[]>([]);
  const [googleCalendarSearch, setGoogleCalendarSearch] = useState("");
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState("");
  const [draftGoogleCalendarBindings, setDraftGoogleCalendarBindings] = useState<
    GoogleCalendarBindingDraft[]
  >([]);
  const [googleChatSearch, setGoogleChatSearch] = useState("");
  const [googleChatSpaceName, setGoogleChatSpaceName] = useState("");
  const [googleChatWebhookUrl, setGoogleChatWebhookUrl] = useState("");
  const [googleChatEventType, setGoogleChatEventType] =
    useState<SlackBindingEventType>("all");
  const [draftGoogleChatBindings, setDraftGoogleChatBindings] = useState<
    GoogleChatBindingDraft[]
  >([]);
  const [githubRepositorySearch, setGithubRepositorySearch] = useState("");
  const [selectedGithubProjectId, setSelectedGithubProjectId] = useState("");
  const [selectedGithubRepositoryFullName, setSelectedGithubRepositoryFullName] =
    useState("");
  const [githubSyncTasks, setGithubSyncTasks] = useState(true);
  const [githubSyncRisks, setGithubSyncRisks] = useState(true);

  const integrationQuery = workspaceSlackHook.useWorkspaceSlackIntegration(
    workspaceId || "",
    { enabled: canManageIntegrations },
  );
  const channelsQuery = workspaceSlackHook.useWorkspaceSlackChannels(
    workspaceId || "",
    { search: channelSearch },
    {
      enabled:
        canManageIntegrations &&
        Boolean(integrationQuery.data?.data?.isConnected),
    },
  );

  const startOAuthMutation = workspaceSlackHook.useStartWorkspaceSlackOAuth();
  const updateBindingsMutation = workspaceSlackHook.useUpdateWorkspaceSlackChannels();
  const sendTestMutation = workspaceSlackHook.useSendWorkspaceSlackTest();
  const disconnectMutation = workspaceSlackHook.useDisconnectWorkspaceSlack();
  const googleIntegrationQuery =
    workspaceGoogleCalendarHook.useWorkspaceGoogleCalendarIntegration(
      workspaceId || "",
      { enabled: canManageIntegrations },
    );
  const googleCalendarsQuery = workspaceGoogleCalendarHook.useWorkspaceGoogleCalendars(
    workspaceId || "",
    { search: googleCalendarSearch },
    {
      enabled:
        canManageIntegrations &&
        Boolean(googleIntegrationQuery.data?.data?.isConnected),
    },
  );
  const startGoogleOAuthMutation =
    workspaceGoogleCalendarHook.useStartWorkspaceGoogleCalendarOAuth();
  const updateGoogleCalendarsMutation =
    workspaceGoogleCalendarHook.useUpdateWorkspaceGoogleCalendars();
  const sendGoogleCalendarTestMutation =
    workspaceGoogleCalendarHook.useSendWorkspaceGoogleCalendarTest();
  const disconnectGoogleCalendarMutation =
    workspaceGoogleCalendarHook.useDisconnectWorkspaceGoogleCalendar();
  const googleDriveIntegrationQuery =
    workspaceGoogleDriveHook.useWorkspaceGoogleDriveIntegration(
      workspaceId || "",
      { enabled: canManageIntegrations },
    );
  const googleChatIntegrationQuery =
    workspaceGoogleChatHook.useWorkspaceGoogleChatIntegration(workspaceId || "", {
      enabled: canManageIntegrations,
    });
  const googleChatSpacesQuery = workspaceGoogleChatHook.useWorkspaceGoogleChatSpaces(
    workspaceId || "",
    {
      search: googleChatSearch,
    },
    {
      enabled:
        canManageIntegrations &&
        Boolean(googleChatIntegrationQuery.data?.data?.isConnected),
    },
  );
  const githubIntegrationQuery = workspaceGithubHook.useWorkspaceGithubIntegration(
    workspaceId || "",
    { enabled: canManageIntegrations },
  );
  const workspaceProjectsQuery = workspaceProjectHook.useWorkspaceProjects(
    workspaceId || "",
    {
      page: 1,
      limit: 100,
      search: "",
      archived: false,
    },
  );
  const githubRepositoriesQuery = workspaceGithubHook.useWorkspaceGithubRepositories(
    workspaceId || "",
    {
      search: githubRepositorySearch,
      page: 1,
      perPage: 100,
    },
    {
      enabled:
        canManageIntegrations &&
        Boolean(githubIntegrationQuery.data?.data?.isConnected),
    },
  );
  const githubProjectBindingQuery =
    workspaceGithubHook.useWorkspaceProjectGithubBinding(
      workspaceId || "",
      selectedGithubProjectId,
      {
        enabled:
          canManageIntegrations &&
          Boolean(githubIntegrationQuery.data?.data?.isConnected) &&
          Boolean(selectedGithubProjectId),
      },
    );
  const startGoogleDriveOAuthMutation =
    workspaceGoogleDriveHook.useStartWorkspaceGoogleDriveOAuth();
  const disconnectGoogleDriveMutation =
    workspaceGoogleDriveHook.useDisconnectWorkspaceGoogleDrive();
  const updateGoogleChatSpacesMutation =
    workspaceGoogleChatHook.useUpdateWorkspaceGoogleChatSpaces();
  const sendGoogleChatTestMutation =
    workspaceGoogleChatHook.useSendWorkspaceGoogleChatTest();
  const disconnectGoogleChatMutation =
    workspaceGoogleChatHook.useDisconnectWorkspaceGoogleChat();
  const startGithubOAuthMutation =
    workspaceGithubHook.useStartWorkspaceGithubOAuth();
  const disconnectGithubMutation = workspaceGithubHook.useDisconnectWorkspaceGithub();
  const updateProjectGithubBindingMutation =
    workspaceGithubHook.useUpdateWorkspaceProjectGithubBinding();
  const disconnectProjectGithubBindingMutation =
    workspaceGithubHook.useDisconnectWorkspaceProjectGithubBinding();

  const integration = integrationQuery.data?.data;
  const connected = Boolean(integration?.isConnected);
  const channelOptions = useMemo(
    () => channelsQuery.data?.data?.channels ?? [],
    [channelsQuery.data?.data?.channels],
  );
  const initialBindings = useMemo(
    () => integration?.channels ?? [],
    [integration?.channels],
  );
  const googleIntegration = googleIntegrationQuery.data?.data;
  const googleConnected = Boolean(googleIntegration?.isConnected);
  const googleDriveIntegration = googleDriveIntegrationQuery.data?.data;
  const googleDriveConnected = Boolean(googleDriveIntegration?.isConnected);
  const googleChatIntegration = googleChatIntegrationQuery.data?.data;
  const googleChatConnected = Boolean(googleChatIntegration?.isConnected);
  const googleChatSpaces = useMemo(
    () => googleChatSpacesQuery.data?.data?.spaces ?? [],
    [googleChatSpacesQuery.data?.data?.spaces],
  );
  const githubIntegration = githubIntegrationQuery.data?.data;
  const githubConnected = Boolean(githubIntegration?.isConnected);
  const workspaceProjects = useMemo(
    () => workspaceProjectsQuery.data?.data?.projects ?? [],
    [workspaceProjectsQuery.data?.data?.projects],
  );
  const githubRepositories = githubRepositoriesQuery.data?.data?.repositories ?? [];
  const githubBinding = githubProjectBindingQuery.data?.data?.binding || null;
  const googleCalendarOptions = useMemo(
    () => googleCalendarsQuery.data?.data?.calendars ?? [],
    [googleCalendarsQuery.data?.data?.calendars],
  );
  const initialGoogleCalendarBindings = useMemo(
    () => googleIntegration?.calendars ?? [],
    [googleIntegration?.calendars],
  );
  const initialGoogleChatBindings = useMemo(
    () =>
      (googleChatIntegration?.spaces || []).map((binding) => ({
        spaceName: binding.spaceName,
        eventTypes: toSlackEventTypes(binding.eventTypes),
        enabled: binding.enabled !== false,
        webhookPreview: binding.webhookPreview || "",
        webhookUrl: "",
      })),
    [googleChatIntegration?.spaces],
  );

  useEffect(() => {
    setDraftBindings(
      initialBindings.map((binding) => ({
        channelId: binding.channelId,
        channelName: binding.channelName,
        eventTypes: binding.eventTypes?.length ? binding.eventTypes : ["all"],
        enabled: binding.enabled !== false,
      })),
    );
  }, [initialBindings]);

  useEffect(() => {
    setDraftGoogleCalendarBindings(
      initialGoogleCalendarBindings.map((binding) => ({
        calendarId: binding.calendarId,
        calendarName: binding.calendarName,
        colorId: binding.colorId,
        isPrimary: binding.isPrimary,
        enabled: binding.enabled !== false,
      })),
    );
  }, [initialGoogleCalendarBindings]);

  useEffect(() => {
    setDraftGoogleChatBindings(
      initialGoogleChatBindings.map((binding) => ({
        spaceName: binding.spaceName,
        eventTypes: binding.eventTypes?.length ? binding.eventTypes : ["all"],
        enabled: binding.enabled !== false,
        webhookPreview: binding.webhookPreview || "",
        webhookUrl: "",
      })),
    );
  }, [initialGoogleChatBindings]);

  useEffect(() => {
    if (selectedGithubProjectId || !workspaceProjects.length) {
      return;
    }

    setSelectedGithubProjectId(String(workspaceProjects[0]?.projectId || ""));
  }, [selectedGithubProjectId, workspaceProjects]);

  useEffect(() => {
    if (!githubBinding) {
      setSelectedGithubRepositoryFullName("");
      setGithubSyncTasks(true);
      setGithubSyncRisks(true);
      return;
    }

    setSelectedGithubRepositoryFullName(
      String(githubBinding.repositoryFullName || "").trim(),
    );
    setGithubSyncTasks(githubBinding.syncTasks !== false);
    setGithubSyncRisks(githubBinding.syncRisks !== false);
  }, [githubBinding]);

  useEffect(() => {
    const integrationParam = String(searchParams.get("integration") || "").trim();
    if (
      integrationParam !== "slack" &&
      integrationParam !== "google-calendar" &&
      integrationParam !== "google-drive" &&
      integrationParam !== "github"
    ) {
      return;
    }

    const status = String(searchParams.get("status") || "").trim();
    const reason = String(searchParams.get("reason") || "").trim();
    const isSlack = integrationParam === "slack";
    const isGoogleCalendar = integrationParam === "google-calendar";
    const isGoogleDrive = integrationParam === "google-drive";
    const isGithub = integrationParam === "github";

    if (status === "connected") {
      if (isSlack) {
        toast.success("Slack connected successfully.");
        queryClient.invalidateQueries({
          queryKey: ["workspace-slack-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-slack-channels", workspaceId],
        });
      }

      if (isGoogleCalendar) {
        toast.success("Google Calendar connected successfully.");
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-calendar-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-calendar-calendars", workspaceId],
        });
      }

      if (isGoogleDrive) {
        toast.success("Google Drive connected successfully.");
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-drive-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-drive-files", workspaceId],
        });
      }

      if (isGithub) {
        toast.success("GitHub connected successfully.");
        queryClient.invalidateQueries({
          queryKey: ["workspace-github-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-github-repositories", workspaceId],
        });
      }
    } else if (status === "error") {
      toast.error(
        isGoogleCalendar
          ? "Google Calendar connection failed."
          : isGoogleDrive
            ? "Google Drive connection failed."
            : isGithub
              ? "GitHub connection failed."
            : "Slack connection failed.",
        {
          description: reason || "Could not complete OAuth.",
        },
      );
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("integration");
    nextParams.delete("status");
    nextParams.delete("reason");
    nextParams.delete("workspaceId");

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, queryClient, router, searchParams, workspaceId]);

  const unboundChannels = useMemo(
    () =>
      channelOptions.filter(
        (channel) =>
          !draftBindings.some((binding) => binding.channelId === channel.id),
      ),
    [channelOptions, draftBindings],
  );

  const selectedChannel = useMemo(
    () => channelOptions.find((channel) => channel.id === selectedChannelId) || null,
    [channelOptions, selectedChannelId],
  );

  const bindingsChanged = useMemo(
    () => !areBindingsEqual(draftBindings, initialBindings),
    [draftBindings, initialBindings],
  );
  const unboundGoogleCalendars = useMemo(
    () =>
      googleCalendarOptions.filter(
        (calendar) =>
          !draftGoogleCalendarBindings.some(
            (binding) => binding.calendarId === calendar.id,
          ),
      ),
    [googleCalendarOptions, draftGoogleCalendarBindings],
  );
  const selectedGoogleCalendar = useMemo(
    () =>
      googleCalendarOptions.find(
        (calendar) => calendar.id === selectedGoogleCalendarId,
      ) || null,
    [googleCalendarOptions, selectedGoogleCalendarId],
  );
  const googleCalendarBindingsChanged = useMemo(
    () =>
      !areGoogleCalendarBindingsEqual(
        draftGoogleCalendarBindings,
        initialGoogleCalendarBindings,
      ),
    [draftGoogleCalendarBindings, initialGoogleCalendarBindings],
  );
  const filteredGoogleChatBindings = useMemo(() => {
    const needle = String(googleChatSearch || "")
      .trim()
      .toLowerCase();

    if (!needle) {
      return draftGoogleChatBindings;
    }

    return draftGoogleChatBindings.filter((binding) =>
      String(binding.spaceName || "")
        .trim()
        .toLowerCase()
        .includes(needle),
    );
  }, [draftGoogleChatBindings, googleChatSearch]);
  const googleChatBindingsChanged = useMemo(
    () =>
      !areGoogleChatBindingsEqual(draftGoogleChatBindings, initialGoogleChatBindings) ||
      draftGoogleChatBindings.some((binding) =>
        Boolean(String(binding.webhookUrl || "").trim()),
      ),
    [draftGoogleChatBindings, initialGoogleChatBindings],
  );

  const handleStartSlackOAuth = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const loadingId = toast.loading("Opening Slack connection...");

    try {
      const response = await startOAuthMutation.mutateAsync({ workspaceId });
      const authUrl = String(response?.data?.authUrl || "").trim();

      if (!authUrl) {
        throw new Error("Slack OAuth URL is unavailable");
      }

      toast.success("Redirecting to Slack...", { id: loadingId });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error("Could not start Slack OAuth", {
        id: loadingId,
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleDisconnectSlack = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Disconnecting Slack...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-slack-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-slack-channels", workspaceId],
        });
        return "Slack integration disconnected.";
      },
      error: "Could not disconnect Slack integration.",
    });
  };

  const handleSendTestMessage = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = sendTestMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Sending Slack test message...",
      success: "Slack test message sent.",
      error: "Could not send Slack test message.",
    });
  };

  const handleAddChannelBinding = () => {
    if (!selectedChannel) {
      return;
    }

    setDraftBindings((current) => [
      ...current,
      {
        channelId: selectedChannel.id,
        channelName: selectedChannel.name,
        eventTypes: ["all"],
        enabled: true,
      },
    ]);
    setSelectedChannelId("");
  };

  const handleRemoveBinding = (channelId: string) => {
    setDraftBindings((current) =>
      current.filter((binding) => binding.channelId !== channelId),
    );
  };

  const handleChangeBindingEvent = (
    channelId: string,
    eventType: SlackBindingEventType,
  ) => {
    setDraftBindings((current) =>
      current.map((binding) =>
        binding.channelId === channelId
          ? {
              ...binding,
              eventTypes: [eventType],
            }
          : binding,
      ),
    );
  };

  const handleSaveBindings = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = updateBindingsMutation.mutateAsync({
      workspaceId,
      payload: {
        channels: draftBindings.map((binding) => ({
          channelId: binding.channelId,
          channelName: binding.channelName,
          eventTypes:
            binding.eventTypes?.length && binding.eventTypes[0]
              ? binding.eventTypes
              : ["all"],
          enabled: binding.enabled !== false,
        })),
      },
    });

    await toast.promise(request, {
      loading: "Saving Slack channel bindings...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-slack-integration", workspaceId],
        });
        return "Slack channel bindings updated.";
      },
      error: "Could not update Slack channel bindings.",
    });
  };

  const handleStartGoogleCalendarOAuth = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const loadingId = toast.loading("Opening Google Calendar connection...");

    try {
      const response = await startGoogleOAuthMutation.mutateAsync({ workspaceId });
      const authUrl = String(response?.data?.authUrl || "").trim();

      if (!authUrl) {
        throw new Error("Google Calendar OAuth URL is unavailable");
      }

      toast.success("Redirecting to Google...", { id: loadingId });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error("Could not start Google Calendar OAuth", {
        id: loadingId,
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectGoogleCalendarMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Disconnecting Google Calendar...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-calendar-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-calendar-calendars", workspaceId],
        });
        return "Google Calendar integration disconnected.";
      },
      error: "Could not disconnect Google Calendar integration.",
    });
  };

  const handleSendGoogleCalendarTest = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = sendGoogleCalendarTestMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Creating Google Calendar test event...",
      success: "Google Calendar test event created.",
      error: "Could not create Google Calendar test event.",
    });
  };

  const handleAddGoogleCalendarBinding = () => {
    if (!selectedGoogleCalendar) {
      return;
    }

    setDraftGoogleCalendarBindings((current) => [
      ...current,
      {
        calendarId: selectedGoogleCalendar.id,
        calendarName: selectedGoogleCalendar.summary,
        colorId: selectedGoogleCalendar.colorId,
        isPrimary: selectedGoogleCalendar.isPrimary,
        enabled: true,
      },
    ]);
    setSelectedGoogleCalendarId("");
  };

  const handleRemoveGoogleCalendarBinding = (calendarId: string) => {
    setDraftGoogleCalendarBindings((current) =>
      current.filter((binding) => binding.calendarId !== calendarId),
    );
  };

  const handleSaveGoogleCalendarBindings = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = updateGoogleCalendarsMutation.mutateAsync({
      workspaceId,
      payload: {
        calendars: draftGoogleCalendarBindings.map((binding) => ({
          calendarId: binding.calendarId,
          calendarName: binding.calendarName,
          colorId: binding.colorId,
          isPrimary: binding.isPrimary,
          enabled: binding.enabled !== false,
        })),
      },
    });

    await toast.promise(request, {
      loading: "Saving Google Calendar bindings...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-calendar-integration", workspaceId],
        });
        return "Google Calendar bindings updated.";
      },
      error: "Could not update Google Calendar bindings.",
    });
  };

  const handleAddGoogleChatBinding = () => {
    const spaceName = String(googleChatSpaceName || "").trim();
    const webhookUrl = String(googleChatWebhookUrl || "").trim();

    if (!spaceName) {
      toast.error("Space name is required.");
      return;
    }

    if (!webhookUrl) {
      toast.error("Webhook URL is required.");
      return;
    }

    setDraftGoogleChatBindings((current) => {
      const key = spaceName.toLowerCase();
      if (current.some((binding) => binding.spaceName.toLowerCase() === key)) {
        toast.error("This Google Chat space is already added.");
        return current;
      }

      return [
        ...current,
        {
          spaceName,
          eventTypes: [googleChatEventType || "all"],
          enabled: true,
          webhookPreview: "",
          webhookUrl,
        },
      ];
    });

    setGoogleChatSpaceName("");
    setGoogleChatWebhookUrl("");
    setGoogleChatEventType("all");
  };

  const handleRemoveGoogleChatBinding = (spaceName: string) => {
    const target = String(spaceName || "").trim().toLowerCase();
    setDraftGoogleChatBindings((current) =>
      current.filter(
        (binding) => String(binding.spaceName || "").trim().toLowerCase() !== target,
      ),
    );
  };

  const handleChangeGoogleChatBindingEvent = (
    spaceName: string,
    eventType: SlackBindingEventType,
  ) => {
    const target = String(spaceName || "").trim().toLowerCase();
    setDraftGoogleChatBindings((current) =>
      current.map((binding) =>
        String(binding.spaceName || "").trim().toLowerCase() === target
          ? {
              ...binding,
              eventTypes: [eventType],
            }
          : binding,
      ),
    );
  };

  const handleToggleGoogleChatBindingEnabled = (
    spaceName: string,
    enabled: boolean,
  ) => {
    const target = String(spaceName || "").trim().toLowerCase();
    setDraftGoogleChatBindings((current) =>
      current.map((binding) =>
        String(binding.spaceName || "").trim().toLowerCase() === target
          ? {
              ...binding,
              enabled,
            }
          : binding,
      ),
    );
  };

  const handleUpdateGoogleChatBindingWebhook = (
    spaceName: string,
    webhookUrl: string,
  ) => {
    const target = String(spaceName || "").trim().toLowerCase();
    setDraftGoogleChatBindings((current) =>
      current.map((binding) =>
        String(binding.spaceName || "").trim().toLowerCase() === target
          ? {
              ...binding,
              webhookUrl,
            }
          : binding,
      ),
    );
  };

  const handleSaveGoogleChatBindings = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const existingByKey = new Set(
      initialGoogleChatBindings.map((binding) =>
        String(binding.spaceName || "").trim().toLowerCase(),
      ),
    );

    const normalizedPayload = draftGoogleChatBindings.map((binding) => {
      const normalizedSpaceName = String(binding.spaceName || "").trim();
      const normalizedKey = normalizedSpaceName.toLowerCase();
      const normalizedWebhookUrl = String(binding.webhookUrl || "").trim();

      if (!normalizedSpaceName) {
        throw new Error("All Google Chat spaces must have a name.");
      }

      if (!existingByKey.has(normalizedKey) && !normalizedWebhookUrl) {
        throw new Error(
          `Webhook URL is required for new Google Chat space: ${normalizedSpaceName}`,
        );
      }

      return {
        spaceName: normalizedSpaceName,
        eventTypes: toSlackEventTypes(binding.eventTypes),
        enabled: binding.enabled !== false,
        ...(normalizedWebhookUrl ? { webhookUrl: normalizedWebhookUrl } : {}),
      };
    });

    const request = updateGoogleChatSpacesMutation.mutateAsync({
      workspaceId,
      payload: {
        spaces: normalizedPayload,
      },
    });

    await toast.promise(request, {
      loading: "Saving Google Chat space bindings...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-chat-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-chat-spaces", workspaceId],
        });
        return "Google Chat bindings updated.";
      },
      error: (error) =>
        error instanceof Error ? error.message : "Could not update Google Chat bindings.",
    });
  };

  const handleSendGoogleChatTest = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = sendGoogleChatTestMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Sending Google Chat test message...",
      success: "Google Chat test message sent.",
      error: "Could not send Google Chat test message.",
    });
  };

  const handleDisconnectGoogleChat = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectGoogleChatMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Disconnecting Google Chat...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-chat-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-chat-spaces", workspaceId],
        });
        return "Google Chat integration disconnected.";
      },
      error: "Could not disconnect Google Chat integration.",
    });
  };

  const handleStartGoogleDriveOAuth = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const loadingId = toast.loading("Opening Google Drive connection...");

    try {
      const response = await startGoogleDriveOAuthMutation.mutateAsync({
        workspaceId,
      });
      const authUrl = String(response?.data?.authUrl || "").trim();

      if (!authUrl) {
        throw new Error("Google Drive OAuth URL is unavailable");
      }

      toast.success("Redirecting to Google...", { id: loadingId });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error("Could not start Google Drive OAuth", {
        id: loadingId,
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectGoogleDriveMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Disconnecting Google Drive...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-drive-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-google-drive-files", workspaceId],
        });
        return "Google Drive integration disconnected.";
      },
      error: "Could not disconnect Google Drive integration.",
    });
  };

  const handleStartGithubOAuth = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const loadingId = toast.loading("Opening GitHub connection...");

    try {
      const response = await startGithubOAuthMutation.mutateAsync({
        workspaceId,
      });
      const authUrl = String(response?.data?.authUrl || "").trim();

      if (!authUrl) {
        throw new Error("GitHub OAuth URL is unavailable");
      }

      toast.success("Redirecting to GitHub...", { id: loadingId });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error("Could not start GitHub OAuth", {
        id: loadingId,
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleDisconnectGithub = async () => {
    if (!workspaceId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectGithubMutation.mutateAsync({ workspaceId });

    await toast.promise(request, {
      loading: "Disconnecting GitHub...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: ["workspace-github-integration", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-github-repositories", workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ["workspace-project-github-binding", workspaceId],
        });
        return "GitHub integration disconnected.";
      },
      error: "Could not disconnect GitHub integration.",
    });
  };

  const handleSaveProjectGithubBinding = async () => {
    if (
      !workspaceId ||
      !selectedGithubProjectId ||
      !selectedGithubRepositoryFullName ||
      !canManageWorkspaceSettings
    ) {
      return;
    }

    const request = updateProjectGithubBindingMutation.mutateAsync({
      workspaceId,
      projectId: selectedGithubProjectId,
      payload: {
        repositoryFullName: selectedGithubRepositoryFullName,
        syncRisks: githubSyncRisks,
        syncTasks: githubSyncTasks,
      },
    });

    await toast.promise(request, {
      loading: "Saving project GitHub binding...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-project-github-binding",
            workspaceId,
            selectedGithubProjectId,
          ],
        });
        return "Project GitHub binding updated.";
      },
      error: "Could not update project GitHub binding.",
    });
  };

  const handleDisconnectProjectGithubBinding = async () => {
    if (!workspaceId || !selectedGithubProjectId || !canManageWorkspaceSettings) {
      return;
    }

    const request = disconnectProjectGithubBindingMutation.mutateAsync({
      workspaceId,
      projectId: selectedGithubProjectId,
    });

    await toast.promise(request, {
      loading: "Disconnecting project repository binding...",
      success: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "workspace-project-github-binding",
            workspaceId,
            selectedGithubProjectId,
          ],
        });
        return "Project repository binding removed.";
      },
      error: "Could not remove project repository binding.",
    });
  };

  if (
    canManageIntegrations &&
    (integrationQuery.isLoading ||
      googleIntegrationQuery.isLoading ||
      googleDriveIntegrationQuery.isLoading ||
      googleChatIntegrationQuery.isLoading ||
      githubIntegrationQuery.isLoading)
  ) {
    return <LoaderComponent />;
  }

  if (!canManageWorkspaceSettings) {
    return (
      <FieldGroup className="gap-4">
        <FieldSet>
          <FieldLegend>Integrations</FieldLegend>
          <FieldDescription>
            Connect external services like Slack, Google Calendar, Google Drive,
            and GitHub.
          </FieldDescription>
          <Empty className="border-border/35 bg-card/45 rounded-md border p-5">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Link2 className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyTitle className="text-[13px]">
                Integration settings are restricted
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Only workspace owners and admins can manage integrations.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </FieldSet>
      </FieldGroup>
    );
  }

  return (
    <FieldGroup className="gap-6">
      <FieldSet>
        <FieldLegend>Slack</FieldLegend>
        <FieldDescription>
          Connect Slack and push workspace notifications to selected channels.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Connection status</FieldTitle>
            <FieldDescription>
              Current workspace Slack integration state.
            </FieldDescription>
          </FieldContent>
          <Badge variant={connected ? "default" : "outline"}>
            {connected ? "Connected" : "Not connected"}
          </Badge>
        </Field>

        {integration?.connection ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Workspace</FieldTitle>
              <FieldDescription>
                {integration.connection.teamName
                  ? `Slack workspace: ${integration.connection.teamName}`
                  : "Slack workspace is connected"}
              </FieldDescription>
            </FieldContent>
            <div className="text-muted-foreground text-[12px]">
              {formatDateLabel(integration.connection.installedAt)}
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={!workspaceId || !canManageWorkspaceSettings || startOAuthMutation.isPending}
            onClick={() => void handleStartSlackOAuth()}
          >
            <Slack className="size-3.5" />
            {connected ? "Reconnect Slack" : "Connect Slack"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={
                  !workspaceId ||
                  !connected ||
                  !canManageWorkspaceSettings ||
                  sendTestMutation.isPending ||
                  disconnectMutation.isPending
                }
              >
                <Ellipsis className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => void handleSendTestMessage()}
                disabled={
                  !workspaceId ||
                  !connected ||
                  !canManageWorkspaceSettings ||
                  sendTestMutation.isPending
                }
              >
                <TestTube2 className="size-3.5" />
                Send test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void handleDisconnectSlack()}
                disabled={
                  !workspaceId ||
                  !connected ||
                  !canManageWorkspaceSettings ||
                  disconnectMutation.isPending
                }
              >
                <Unlink className="size-3.5" />
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldSet>

      {connected ? (
        <FieldSet>
          <FieldLegend>Slack channel bindings</FieldLegend>
          <FieldDescription>
            Choose channels and the event type each channel should receive.
          </FieldDescription>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={channelSearch}
              onChange={(event) => setChannelSearch(event.target.value)}
              placeholder="Search Slack channels"
              className="h-9 text-[12.5px]"
              disabled={!canManageWorkspaceSettings}
            />

            <Select
              value={selectedChannelId || undefined}
              onValueChange={setSelectedChannelId}
              disabled={!canManageWorkspaceSettings || !unboundChannels.length}
            >
              <SelectTrigger className="h-9 w-full text-[12.5px] sm:w-72">
                <SelectValue placeholder="Select channel to add" />
              </SelectTrigger>
              <SelectContent>
                {unboundChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.isPrivate ? "#" : ""}{channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-3 text-[12px]"
              disabled={!canManageWorkspaceSettings || !selectedChannel}
              onClick={handleAddChannelBinding}
            >
              <Plus className="size-3.5" />
              Add channel
            </Button>
          </div>

          {channelsQuery.isFetching ? (
            <LoaderComponent />
          ) : draftBindings.length ? (
            <div className="space-y-2">
              {draftBindings.map((binding) => (
                <div
                  key={binding.channelId}
                  className="bg-card/65 ring-border/35 flex flex-col gap-2 rounded-md p-2 ring-1 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      #{binding.channelName}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {binding.channelId}
                    </div>
                  </div>

                  <Select
                    value={(binding.eventTypes?.[0] || "all") as SlackBindingEventType}
                    onValueChange={(value) =>
                      handleChangeBindingEvent(
                        binding.channelId,
                        value as SlackBindingEventType,
                      )
                    }
                    disabled={!canManageWorkspaceSettings}
                  >
                    <SelectTrigger className="h-8 w-full text-[12px] sm:w-60">
                      <SelectValue placeholder="Choose events" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLACK_EVENT_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    disabled={!canManageWorkspaceSettings}
                    onClick={() => handleRemoveBinding(binding.channelId)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border-border/30 bg-card/40 gap-3 rounded-md border p-3 md:p-3">
              <EmptyHeader className="gap-1.5">
                <EmptyMedia variant="icon" className="size-8">
                  <Link2 className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyTitle className="text-[13px]">No Slack channels configured</EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Add at least one channel to start receiving Slack updates.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-[12px]"
              disabled={
                !canManageWorkspaceSettings ||
                !bindingsChanged ||
                updateBindingsMutation.isPending
              }
              onClick={() => void handleSaveBindings()}
            >
              Save bindings
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-[12px]"
              disabled={!canManageWorkspaceSettings || !bindingsChanged}
              onClick={() =>
                setDraftBindings(
                  initialBindings.map((binding) => ({
                    channelId: binding.channelId,
                    channelName: binding.channelName,
                    eventTypes:
                      binding.eventTypes?.length ? binding.eventTypes : ["all"],
                    enabled: binding.enabled !== false,
                  })),
                )
              }
            >
              Reset
            </Button>
          </div>
        </FieldSet>
      ) : null}

      <Separator className="bg-border/45" />

      <FieldSet>
        <FieldLegend>Google Calendar</FieldLegend>
        <FieldDescription>
          Connect Google Calendar and sync project timelines into selected calendars.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Connection status</FieldTitle>
            <FieldDescription>
              Current workspace Google Calendar integration state.
            </FieldDescription>
          </FieldContent>
          <Badge variant={googleConnected ? "default" : "outline"}>
            {googleConnected ? "Connected" : "Not connected"}
          </Badge>
        </Field>

        {googleIntegration?.connection ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Google account</FieldTitle>
              <FieldDescription>
                {googleIntegration.connection.accountEmail ||
                  "Connected Google account"}
              </FieldDescription>
            </FieldContent>
            <div className="text-muted-foreground text-[12px]">
              {formatDateLabel(googleIntegration.connection.installedAt)}
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={
              !workspaceId ||
              !canManageWorkspaceSettings ||
              startGoogleOAuthMutation.isPending
            }
            onClick={() => void handleStartGoogleCalendarOAuth()}
          >
            <CalendarDays className="size-3.5" />
            {googleConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={
                  !workspaceId ||
                  !googleConnected ||
                  !canManageWorkspaceSettings ||
                  sendGoogleCalendarTestMutation.isPending ||
                  disconnectGoogleCalendarMutation.isPending
                }
              >
                <Ellipsis className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => void handleSendGoogleCalendarTest()}
                disabled={
                  !workspaceId ||
                  !googleConnected ||
                  !canManageWorkspaceSettings ||
                  sendGoogleCalendarTestMutation.isPending
                }
              >
                <TestTube2 className="size-3.5" />
                Create test event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void handleDisconnectGoogleCalendar()}
                disabled={
                  !workspaceId ||
                  !googleConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGoogleCalendarMutation.isPending
                }
              >
                <Unlink className="size-3.5" />
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldSet>

      {googleConnected ? (
        <FieldSet>
          <FieldLegend>Google calendar bindings</FieldLegend>
          <FieldDescription>
            Choose calendars where Squircle can create and sync events.
          </FieldDescription>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={googleCalendarSearch}
              onChange={(event) => setGoogleCalendarSearch(event.target.value)}
              placeholder="Search Google calendars"
              className="h-9 text-[12.5px]"
              disabled={!canManageWorkspaceSettings}
            />

            <Select
              value={selectedGoogleCalendarId || undefined}
              onValueChange={setSelectedGoogleCalendarId}
              disabled={
                !canManageWorkspaceSettings || !unboundGoogleCalendars.length
              }
            >
              <SelectTrigger className="h-9 w-full text-[12.5px] sm:w-72">
                <SelectValue placeholder="Select calendar to add" />
              </SelectTrigger>
              <SelectContent>
                {unboundGoogleCalendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-3 text-[12px]"
              disabled={!canManageWorkspaceSettings || !selectedGoogleCalendar}
              onClick={handleAddGoogleCalendarBinding}
            >
              <Plus className="size-3.5" />
              Add calendar
            </Button>
          </div>

          {googleCalendarsQuery.isFetching ? (
            <LoaderComponent />
          ) : draftGoogleCalendarBindings.length ? (
            <div className="space-y-2">
              {draftGoogleCalendarBindings.map((binding) => (
                <div
                  key={binding.calendarId}
                  className="bg-card/65 ring-border/35 flex items-center gap-2 rounded-md p-2 ring-1"
                >
                  <div
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        binding.colorId === "11"
                          ? "var(--chart-1)"
                          : "var(--chart-2)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      {binding.calendarName}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {binding.calendarId}
                    </div>
                  </div>
                  {binding.isPrimary ? (
                    <Badge variant="outline" className="h-6 text-[10px]">
                      Primary
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    disabled={!canManageWorkspaceSettings}
                    onClick={() =>
                      handleRemoveGoogleCalendarBinding(binding.calendarId)
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border-border/30 bg-card/40 gap-3 rounded-md border p-3 md:p-3">
              <EmptyHeader className="gap-1.5">
                <EmptyMedia variant="icon" className="size-8">
                  <CalendarDays className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyTitle className="text-[13px]">
                  No Google calendars configured
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Add at least one calendar to sync Squircle events.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-[12px]"
              disabled={
                !canManageWorkspaceSettings ||
                !googleCalendarBindingsChanged ||
                updateGoogleCalendarsMutation.isPending
              }
              onClick={() => void handleSaveGoogleCalendarBindings()}
            >
              Save bindings
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-[12px]"
              disabled={!canManageWorkspaceSettings || !googleCalendarBindingsChanged}
              onClick={() =>
                setDraftGoogleCalendarBindings(
                  initialGoogleCalendarBindings.map((binding) => ({
                    calendarId: binding.calendarId,
                    calendarName: binding.calendarName,
                    colorId: binding.colorId,
                    isPrimary: binding.isPrimary,
                    enabled: binding.enabled !== false,
                  })),
                )
              }
            >
              Reset
            </Button>
          </div>
        </FieldSet>
      ) : null}

      <Separator className="bg-border/45" />

      <FieldSet>
        <FieldLegend>Google Drive</FieldLegend>
        <FieldDescription>
          Connect Google Drive so project Files & Assets can import cloud files directly.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Connection status</FieldTitle>
            <FieldDescription>
              Current workspace Google Drive integration state.
            </FieldDescription>
          </FieldContent>
          <Badge variant={googleDriveConnected ? "default" : "outline"}>
            {googleDriveConnected ? "Connected" : "Not connected"}
          </Badge>
        </Field>

        {googleDriveIntegration?.connection ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Google account</FieldTitle>
              <FieldDescription>
                {googleDriveIntegration.connection.accountEmail ||
                  "Connected Google account"}
              </FieldDescription>
            </FieldContent>
            <div className="text-muted-foreground text-[12px]">
              {formatDateLabel(googleDriveIntegration.connection.installedAt)}
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={
              !workspaceId ||
              !canManageWorkspaceSettings ||
              startGoogleDriveOAuthMutation.isPending
            }
            onClick={() => void handleStartGoogleDriveOAuth()}
          >
            <HardDrive className="size-3.5" />
            {googleDriveConnected ? "Reconnect Google Drive" : "Connect Google Drive"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={
                  !workspaceId ||
                  !googleDriveConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGoogleDriveMutation.isPending
                }
              >
                <Ellipsis className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void handleDisconnectGoogleDrive()}
                disabled={
                  !workspaceId ||
                  !googleDriveConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGoogleDriveMutation.isPending
                }
              >
                <Unlink className="size-3.5" />
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldSet>

      <Separator className="bg-border/45" />

      <FieldSet>
        <FieldLegend>Google Chat</FieldLegend>
        <FieldDescription>
          Connect Google Chat webhook spaces and send workspace notifications.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Connection status</FieldTitle>
            <FieldDescription>
              Current workspace Google Chat integration state.
            </FieldDescription>
          </FieldContent>
          <Badge variant={googleChatConnected ? "default" : "outline"}>
            {googleChatConnected ? "Connected" : "Not connected"}
          </Badge>
        </Field>

        {googleChatConnected ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Active spaces</FieldTitle>
              <FieldDescription>
                {googleChatSpaces.length} configured space
                {googleChatSpaces.length === 1 ? "" : "s"}.
              </FieldDescription>
            </FieldContent>
            <div className="text-muted-foreground text-[12px]">
              Last updated {formatDateLabel(googleChatIntegration?.spaces?.[0]?.updatedAt)}
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={
                  !workspaceId ||
                  !googleChatConnected ||
                  !canManageWorkspaceSettings ||
                  sendGoogleChatTestMutation.isPending ||
                  disconnectGoogleChatMutation.isPending
                }
              >
                <Ellipsis className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => void handleSendGoogleChatTest()}
                disabled={
                  !workspaceId ||
                  !googleChatConnected ||
                  !canManageWorkspaceSettings ||
                  sendGoogleChatTestMutation.isPending
                }
              >
                <TestTube2 className="size-3.5" />
                Send test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void handleDisconnectGoogleChat()}
                disabled={
                  !workspaceId ||
                  !googleChatConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGoogleChatMutation.isPending
                }
              >
                <Unlink className="size-3.5" />
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Google Chat space bindings</FieldLegend>
        <FieldDescription>
          Add webhook spaces and choose which event type each space receives.
        </FieldDescription>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={googleChatSearch}
            onChange={(event) => setGoogleChatSearch(event.target.value)}
            placeholder="Search configured spaces"
            className="h-9 text-[12.5px]"
            disabled={!canManageWorkspaceSettings}
          />
          <Input
            value={googleChatSpaceName}
            onChange={(event) => setGoogleChatSpaceName(event.target.value)}
            placeholder="Google Chat space name"
            className="h-9 text-[12.5px]"
            disabled={!canManageWorkspaceSettings}
          />
          <Input
            value={googleChatWebhookUrl}
            onChange={(event) => setGoogleChatWebhookUrl(event.target.value)}
            placeholder="Google Chat webhook URL"
            className="h-9 text-[12.5px]"
            disabled={!canManageWorkspaceSettings}
          />
          <Select
            value={googleChatEventType}
            onValueChange={(value) =>
              setGoogleChatEventType(value as SlackBindingEventType)
            }
            disabled={!canManageWorkspaceSettings}
          >
            <SelectTrigger className="h-9 w-full text-[12.5px]">
              <SelectValue placeholder="Select events" />
            </SelectTrigger>
            <SelectContent>
              {SLACK_EVENT_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-3 text-[12px]"
            disabled={
              !canManageWorkspaceSettings ||
              !String(googleChatSpaceName || "").trim() ||
              !String(googleChatWebhookUrl || "").trim()
            }
            onClick={handleAddGoogleChatBinding}
          >
            <Plus className="size-3.5" />
            Add space
          </Button>
        </div>

        {googleChatSpacesQuery.isFetching ? (
          <LoaderComponent />
        ) : filteredGoogleChatBindings.length ? (
          <div className="space-y-2">
            {filteredGoogleChatBindings.map((binding) => (
              <div
                key={binding.spaceName}
                className="bg-card/65 ring-border/35 flex flex-col gap-2 rounded-md p-2 ring-1"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      {binding.spaceName}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {binding.webhookPreview || "Webhook URL stored securely"}
                    </div>
                  </div>
                  <label className="text-muted-foreground flex items-center gap-2 text-[11px]">
                    Enabled
                    <Switch
                      checked={binding.enabled !== false}
                      onCheckedChange={(enabled) =>
                        handleToggleGoogleChatBindingEnabled(binding.spaceName, enabled)
                      }
                      disabled={!canManageWorkspaceSettings}
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                  <Input
                    value={binding.webhookUrl || ""}
                    onChange={(event) =>
                      handleUpdateGoogleChatBindingWebhook(
                        binding.spaceName,
                        event.target.value,
                      )
                    }
                    placeholder="Paste webhook URL to replace existing"
                    className="h-8 text-[12px]"
                    disabled={!canManageWorkspaceSettings}
                  />
                  <Select
                    value={(binding.eventTypes?.[0] || "all") as SlackBindingEventType}
                    onValueChange={(value) =>
                      handleChangeGoogleChatBindingEvent(
                        binding.spaceName,
                        value as SlackBindingEventType,
                      )
                    }
                    disabled={!canManageWorkspaceSettings}
                  >
                    <SelectTrigger className="h-8 w-full text-[12px]">
                      <SelectValue placeholder="Choose events" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLACK_EVENT_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    disabled={!canManageWorkspaceSettings}
                    onClick={() => handleRemoveGoogleChatBinding(binding.spaceName)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty className="border-border/30 bg-card/40 gap-3 rounded-md border p-3 md:p-3">
            <EmptyHeader className="gap-1.5">
              <EmptyMedia variant="icon" className="size-8">
                <MessageCircle className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyTitle className="text-[13px]">
                No Google Chat spaces configured
              </EmptyTitle>
              <EmptyDescription className="text-[12px]">
                Add a space webhook to start receiving notifications in Google Chat.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={
              !canManageWorkspaceSettings ||
              !googleChatBindingsChanged ||
              updateGoogleChatSpacesMutation.isPending
            }
            onClick={() => void handleSaveGoogleChatBindings()}
          >
            Save bindings
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-[12px]"
            disabled={!canManageWorkspaceSettings || !googleChatBindingsChanged}
            onClick={() => {
              setDraftGoogleChatBindings(
                initialGoogleChatBindings.map((binding) => ({
                  ...binding,
                  webhookUrl: "",
                })),
              );
              setGoogleChatSpaceName("");
              setGoogleChatWebhookUrl("");
              setGoogleChatEventType("all");
            }}
          >
            Reset
          </Button>
        </div>
      </FieldSet>

      <Separator className="bg-border/45" />

      <FieldSet>
        <FieldLegend>GitHub</FieldLegend>
        <FieldDescription>
          Connect GitHub and map project risks/tasks to repository issues.
        </FieldDescription>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Connection status</FieldTitle>
            <FieldDescription>
              Current workspace GitHub integration state.
            </FieldDescription>
          </FieldContent>
          <Badge variant={githubConnected ? "default" : "outline"}>
            {githubConnected ? "Connected" : "Not connected"}
          </Badge>
        </Field>

        {githubIntegration?.connection ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>GitHub account</FieldTitle>
              <FieldDescription>
                {githubIntegration.connection.accountLogin
                  ? `@${githubIntegration.connection.accountLogin}`
                  : "Connected GitHub account"}
              </FieldDescription>
            </FieldContent>
            <div className="text-muted-foreground text-[12px]">
              {formatDateLabel(githubIntegration.connection.installedAt)}
            </div>
          </Field>
        ) : null}

        {githubIntegration?.webhook?.url ? (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Inbound webhook</FieldTitle>
              <FieldDescription>
                Configure this URL in GitHub repository webhooks to sync issue
                edits/close/reopen back into Squircle.
              </FieldDescription>
            </FieldContent>
            <div className="max-w-[18rem] text-right text-[11px]">
              <p className="text-foreground truncate font-medium">
                {githubIntegration.webhook.url}
              </p>
              <p className="text-muted-foreground">
                Secret {githubIntegration.webhook.hasSecret ? "configured" : "missing"}
              </p>
            </div>
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={
              !workspaceId ||
              !canManageWorkspaceSettings ||
              startGithubOAuthMutation.isPending
            }
            onClick={() => void handleStartGithubOAuth()}
          >
            <Github className="size-3.5" />
            {githubConnected ? "Reconnect GitHub" : "Connect GitHub"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                disabled={
                  !workspaceId ||
                  !githubConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGithubMutation.isPending
                }
              >
                <Ellipsis className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void handleDisconnectGithub()}
                disabled={
                  !workspaceId ||
                  !githubConnected ||
                  !canManageWorkspaceSettings ||
                  disconnectGithubMutation.isPending
                }
              >
                <Unlink className="size-3.5" />
                Remove integration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldSet>

      {githubConnected ? (
        <FieldSet>
          <FieldLegend>Project repository mapping</FieldLegend>
          <FieldDescription>
            Choose a project and repository to sync risks/issues and tasks.
          </FieldDescription>

          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={selectedGithubProjectId || undefined}
              onValueChange={setSelectedGithubProjectId}
              disabled={!workspaceProjects.length || !canManageWorkspaceSettings}
            >
              <SelectTrigger className="h-9 text-[12.5px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {workspaceProjects.map((project) => (
                  <SelectItem key={project.projectId} value={project.projectId}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={githubRepositorySearch}
              onChange={(event) => setGithubRepositorySearch(event.target.value)}
              placeholder="Search repositories"
              className="h-9 text-[12.5px]"
              disabled={!canManageWorkspaceSettings}
            />
          </div>

          <Select
            value={selectedGithubRepositoryFullName || undefined}
            onValueChange={setSelectedGithubRepositoryFullName}
            disabled={!canManageWorkspaceSettings || !githubRepositories.length}
          >
            <SelectTrigger className="h-9 w-full text-[12.5px]">
              <SelectValue placeholder="Select repository to bind" />
            </SelectTrigger>
            <SelectContent>
              {githubRepositories.map((repository) => (
                <SelectItem key={String(repository.id)} value={repository.fullName}>
                  {repository.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {githubBinding ? (
            <div className="text-muted-foreground text-[12px]">
              Active binding:{" "}
              <span className="text-foreground font-medium">
                {githubBinding.repositoryFullName}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="bg-card/60 ring-border/35 flex items-center justify-between rounded-md px-3 py-2 text-[12px] ring-1">
              <span>Sync risks/issues as GitHub issues</span>
              <Switch
                checked={githubSyncRisks}
                onCheckedChange={setGithubSyncRisks}
                disabled={!canManageWorkspaceSettings}
              />
            </label>
            <label className="bg-card/60 ring-border/35 flex items-center justify-between rounded-md px-3 py-2 text-[12px] ring-1">
              <span>Sync tasks as GitHub issues</span>
              <Switch
                checked={githubSyncTasks}
                onCheckedChange={setGithubSyncTasks}
                disabled={!canManageWorkspaceSettings}
              />
            </label>
          </div>

          {githubRepositoriesQuery.isFetching ? (
            <LoaderComponent />
          ) : githubRepositories.length ? null : (
            <Empty className="border-border/30 bg-card/40 gap-3 rounded-md border p-3 md:p-3">
              <EmptyHeader className="gap-1.5">
                <EmptyMedia variant="icon" className="size-8">
                  <Github className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyTitle className="text-[13px]">
                  No repositories found
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Check repository access on the connected GitHub account.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-[12px]"
              disabled={
                !workspaceId ||
                !selectedGithubProjectId ||
                !selectedGithubRepositoryFullName ||
                !canManageWorkspaceSettings ||
                updateProjectGithubBindingMutation.isPending
              }
              onClick={() => void handleSaveProjectGithubBinding()}
            >
              Save mapping
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-[12px]"
              disabled={
                !workspaceId ||
                !selectedGithubProjectId ||
                !githubBinding ||
                !canManageWorkspaceSettings ||
                disconnectProjectGithubBindingMutation.isPending
              }
              onClick={() => void handleDisconnectProjectGithubBinding()}
            >
              Remove mapping
            </Button>
          </div>
        </FieldSet>
      ) : null}
    </FieldGroup>
  );
};

export default SettingsIntegrations;

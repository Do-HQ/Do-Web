"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  HardDrive,
  Ellipsis,
  Link2,
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
import LoaderComponent from "../shared/loader";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceSlack from "@/hooks/use-workspace-slack";
import useWorkspaceGoogleCalendar from "@/hooks/use-workspace-google-calendar";
import useWorkspaceGoogleDrive from "@/hooks/use-workspace-google-drive";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type {
  SlackBindingEventType,
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

const SettingsIntegrations = () => {
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceSlackHook = useWorkspaceSlack();
  const workspaceGoogleCalendarHook = useWorkspaceGoogleCalendar();
  const workspaceGoogleDriveHook = useWorkspaceGoogleDrive();

  const [channelSearch, setChannelSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [draftBindings, setDraftBindings] = useState<SlackBindingDraft[]>([]);
  const [googleCalendarSearch, setGoogleCalendarSearch] = useState("");
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState("");
  const [draftGoogleCalendarBindings, setDraftGoogleCalendarBindings] = useState<
    GoogleCalendarBindingDraft[]
  >([]);

  const integrationQuery = workspaceSlackHook.useWorkspaceSlackIntegration(
    workspaceId || "",
    { enabled: Boolean(workspaceId) },
  );
  const channelsQuery = workspaceSlackHook.useWorkspaceSlackChannels(
    workspaceId || "",
    { search: channelSearch },
    {
      enabled: Boolean(workspaceId) && Boolean(integrationQuery.data?.data?.isConnected),
    },
  );

  const startOAuthMutation = workspaceSlackHook.useStartWorkspaceSlackOAuth();
  const updateBindingsMutation = workspaceSlackHook.useUpdateWorkspaceSlackChannels();
  const sendTestMutation = workspaceSlackHook.useSendWorkspaceSlackTest();
  const disconnectMutation = workspaceSlackHook.useDisconnectWorkspaceSlack();
  const googleIntegrationQuery =
    workspaceGoogleCalendarHook.useWorkspaceGoogleCalendarIntegration(
      workspaceId || "",
      { enabled: Boolean(workspaceId) },
    );
  const googleCalendarsQuery = workspaceGoogleCalendarHook.useWorkspaceGoogleCalendars(
    workspaceId || "",
    { search: googleCalendarSearch },
    {
      enabled:
        Boolean(workspaceId) &&
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
      { enabled: Boolean(workspaceId) },
    );
  const startGoogleDriveOAuthMutation =
    workspaceGoogleDriveHook.useStartWorkspaceGoogleDriveOAuth();
  const disconnectGoogleDriveMutation =
    workspaceGoogleDriveHook.useDisconnectWorkspaceGoogleDrive();

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
  const googleCalendarOptions = useMemo(
    () => googleCalendarsQuery.data?.data?.calendars ?? [],
    [googleCalendarsQuery.data?.data?.calendars],
  );
  const initialGoogleCalendarBindings = useMemo(
    () => googleIntegration?.calendars ?? [],
    [googleIntegration?.calendars],
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
    const integrationParam = String(searchParams.get("integration") || "").trim();
    if (
      integrationParam !== "slack" &&
      integrationParam !== "google-calendar" &&
      integrationParam !== "google-drive"
    ) {
      return;
    }

    const status = String(searchParams.get("status") || "").trim();
    const reason = String(searchParams.get("reason") || "").trim();
    const isSlack = integrationParam === "slack";
    const isGoogleCalendar = integrationParam === "google-calendar";
    const isGoogleDrive = integrationParam === "google-drive";

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
    } else if (status === "error") {
      toast.error(
        isGoogleCalendar
          ? "Google Calendar connection failed."
          : isGoogleDrive
            ? "Google Drive connection failed."
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

  if (
    integrationQuery.isLoading ||
    googleIntegrationQuery.isLoading ||
    googleDriveIntegrationQuery.isLoading
  ) {
    return <LoaderComponent />;
  }

  return (
    <FieldGroup className="gap-8">
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
    </FieldGroup>
  );
};

export default SettingsIntegrations;

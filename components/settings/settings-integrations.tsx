"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2, Plus, Slack, TestTube2, Trash2, Unlink } from "lucide-react";

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
import LoaderComponent from "../shared/loader";
import useWorkspaceStore from "@/stores/workspace";
import useWorkspaceSlack from "@/hooks/use-workspace-slack";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import type {
  SlackBindingEventType,
  WorkspaceSlackChannelBindingRecord,
} from "@/types/integration";

type SlackBindingDraft = Pick<
  WorkspaceSlackChannelBindingRecord,
  "channelId" | "channelName" | "eventTypes" | "enabled"
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

const SettingsIntegrations = () => {
  const { workspaceId } = useWorkspaceStore();
  const { canManageWorkspaceSettings } = useWorkspacePermissions();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspaceSlackHook = useWorkspaceSlack();

  const [channelSearch, setChannelSearch] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [draftBindings, setDraftBindings] = useState<SlackBindingDraft[]>([]);

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
    const integrationParam = String(searchParams.get("integration") || "").trim();
    if (integrationParam !== "slack") {
      return;
    }

    const status = String(searchParams.get("status") || "").trim();
    const reason = String(searchParams.get("reason") || "").trim();

    if (status === "connected") {
      toast.success("Slack connected successfully.");
      queryClient.invalidateQueries({
        queryKey: ["workspace-slack-integration", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace-slack-channels", workspaceId],
      });
    } else if (status === "error") {
      toast.error("Slack connection failed.", {
        description: reason || "Could not complete Slack OAuth.",
      });
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

  if (integrationQuery.isLoading) {
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

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[12px]"
            disabled={
              !workspaceId ||
              !connected ||
              !canManageWorkspaceSettings ||
              sendTestMutation.isPending
            }
            onClick={() => void handleSendTestMessage()}
          >
            <TestTube2 className="size-3.5" />
            Send test
          </Button>

          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 px-3 text-[12px]"
            disabled={
              !workspaceId ||
              !connected ||
              !canManageWorkspaceSettings ||
              disconnectMutation.isPending
            }
            onClick={() => void handleDisconnectSlack()}
          >
            <Unlink className="size-3.5" />
            Disconnect
          </Button>
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
            <Empty className="border-border/30 bg-card/40 rounded-md border p-5">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Link2 className="size-4 text-primary/85" />
                </EmptyMedia>
                <EmptyTitle>No Slack channels configured</EmptyTitle>
                <EmptyDescription>
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
    </FieldGroup>
  );
};

export default SettingsIntegrations;

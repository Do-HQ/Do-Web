"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Save } from "lucide-react";
import { toast } from "sonner";

import useWorkspaceStandup from "@/hooks/use-workspace-standup";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspaceStore from "@/stores/workspace";
import type { StandupSettings } from "@/types/standup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import StandupAiAvailabilityNote from "./standup-ai-availability-note";
import { formatStandupDateTime } from "./standup-utils";

const sourceFields: Array<[keyof StandupSettings, string, string]> = [
  [
    "includeTasks",
    "Tasks",
    "Ask about assigned, overdue, due soon, and blocked tasks.",
  ],
  ["includeRisks", "Risks", "Ask for updates on assigned open risks."],
  [
    "includeIssues",
    "Issues",
    "Include issue-style risk signals when available.",
  ],
  [
    "includeMentions",
    "Mentions",
    "Show unread mention notifications after the member submits.",
  ],
  [
    "includeDocsMentions",
    "Docs mentions",
    "Stored for docs mention support when available.",
  ],
  [
    "includeSpacesMentions",
    "Spaces mentions",
    "Summarize unread space tags after submission without exposing private message contents.",
  ],
  [
    "includeJamsMentions",
    "Jams mentions",
    "Summarize unread jam tags after submission.",
  ],
  [
    "includeCatchupThreads",
    "Catch-up threads",
    "Surface unread catch-up items the member should review.",
  ],
];

const WorkspaceStandupSettingsPage = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const standup = useWorkspaceStandup();
  const settingsQuery = standup.useStandupSettings(normalizedWorkspaceId, {
    enabled: !!normalizedWorkspaceId && permissions.isAdminLike,
  });
  const updateMutation = standup.useUpdateStandupSettings();
  const [form, setForm] = useState<Partial<StandupSettings>>({});

  useEffect(() => {
    if (settingsQuery.data?.data?.settings) {
      setForm(settingsQuery.data.data.settings);
    }
  }, [settingsQuery.data]);

  if (!permissions.isAdminLike) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4">
        <Empty className="rounded-lg border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Standup settings are admin-only</EmptyTitle>
            <EmptyDescription>
              Only workspace owners and admins can configure scheduled standups.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[620px] rounded-lg" />
      </div>
    );
  }

  const nextStandup = settingsQuery.data?.data?.nextStandup;

  const setField = <K extends keyof StandupSettings>(
    field: K,
    value: StandupSettings[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const payload = {
      enabled: Boolean(form.enabled),
      timeOfDay: String(form.timeOfDay || "09:00"),
      timezone: String(form.timezone || "Africa/Lagos"),
      allowedWindowMinutes: Number(form.allowedWindowMinutes || 120),
      reminderAtHalfWindow: Boolean(form.reminderAtHalfWindow),
      pointsPenaltyForMissing: Number(form.pointsPenaltyForMissing ?? 2),
      includeTasks: Boolean(form.includeTasks),
      includeRisks: Boolean(form.includeRisks),
      includeIssues: Boolean(form.includeIssues),
      includeMentions: Boolean(form.includeMentions),
      includeDocsMentions: Boolean(form.includeDocsMentions),
      includeSpacesMentions: Boolean(form.includeSpacesMentions),
      includeJamsMentions: Boolean(form.includeJamsMentions),
      includeCatchupThreads: Boolean(form.includeCatchupThreads),
      maxQuestions: Number(form.maxQuestions || 15),
    };
    const request = updateMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      payload,
    });
    try {
      await toast.promise(request, {
        loading: "Saving standup settings...",
        success: "Standup settings updated.",
        error: "We could not update standup settings.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["standup-settings", normalizedWorkspaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["standup-overview", normalizedWorkspaceId],
      });
    } catch {}
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-4 flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Standup settings
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure when Scribe prompts members and which safe work signals it
            can use.
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="size-4" /> Save changes
        </Button>
      </div>

      <StandupAiAvailabilityNote workspaceId={normalizedWorkspaceId} />

      <Card className="rounded-lg border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>
            Next standup opens {formatStandupDateTime(nextStandup?.opensAt)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
            <div>
              <Label>Activate Standup</Label>
              <p className="text-sm text-muted-foreground">
                Members are prompted automatically at the configured time.
              </p>
            </div>
            <Switch
              checked={Boolean(form.enabled)}
              onCheckedChange={(checked) => setField("enabled", checked)}
            />
          </div>
          <div className="space-y-2">
            <Label>Time of day</Label>
            <Input
              type="time"
              value={String(form.timeOfDay || "09:00")}
              onChange={(event) => setField("timeOfDay", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={String(form.timezone || "Africa/Lagos")}
              onChange={(event) => setField("timezone", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Allowed window (minutes)</Label>
            <Input
              type="number"
              min={15}
              max={1440}
              value={Number(form.allowedWindowMinutes || 120)}
              onChange={(event) =>
                setField("allowedWindowMinutes", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max questions</Label>
            <Input
              type="number"
              min={3}
              max={15}
              value={Number(form.maxQuestions || 15)}
              onChange={(event) =>
                setField("maxQuestions", Number(event.target.value))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
            <div>
              <Label>Half-window reminder</Label>
              <p className="text-sm text-muted-foreground">
                Send a reminder to members who have not submitted halfway
                through the window.
              </p>
            </div>
            <Switch
              checked={Boolean(form.reminderAtHalfWindow)}
              onCheckedChange={(checked) =>
                setField("reminderAtHalfWindow", checked)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Missed standup penalty</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={Number(form.pointsPenaltyForMissing ?? 2)}
              onChange={(event) =>
                setField("pointsPenaltyForMissing", Number(event.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Signals Scribe can use</CardTitle>
          <CardDescription>
            These sources are compacted and sanitized before AI is used.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {sourceFields.map(([field, title, description]) => (
            <div
              key={field}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <Label>{title}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={Boolean(form[field])}
                onCheckedChange={(checked) => setField(field, checked as never)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceStandupSettingsPage;

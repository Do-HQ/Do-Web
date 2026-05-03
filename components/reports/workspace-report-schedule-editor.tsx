"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceReports from "@/hooks/use-workspace-reports";
import useWorkspace from "@/hooks/use-workspace";
import useWorkspaceStore from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceReportScheduleForm from "./workspace-report-schedule-form";
import type { CreateWorkspaceReportScheduleRequestBody } from "@/types/reports";

type WorkspaceReportScheduleEditorProps = {
  scheduleId?: string;
};

const WorkspaceReportScheduleEditor = ({
  scheduleId,
}: WorkspaceReportScheduleEditorProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const isEditMode = Boolean(scheduleId);

  const workspaceProjectHook = useWorkspaceProject();
  const workspaceReportsHook = useWorkspaceReports();
  const workspaceHook = useWorkspace();

  const projectsQuery = workspaceProjectHook.useWorkspaceProjects(
    normalizedWorkspaceId,
    {
      page: 1,
      limit: 100,
      search: "",
      archived: false,
    },
  );
  const membersQuery = workspaceHook.useWorkspacePeople(normalizedWorkspaceId, {
    page: 1,
    limit: 200,
    search: "",
  });

  const scheduleQuery = workspaceReportsHook.useWorkspaceReportSchedule(
    normalizedWorkspaceId,
    String(scheduleId || ""),
    {
      enabled: isEditMode && !!normalizedWorkspaceId,
    },
  );

  const createMutation = workspaceReportsHook.useCreateWorkspaceReportSchedule();
  const updateMutation = workspaceReportsHook.useUpdateWorkspaceReportSchedule();

  const projectOptions = useMemo(() => {
    const records = projectsQuery.data?.data?.projects || [];

    return records.map((project) => ({
      id: String(project.projectId || "").trim(),
      name: String(project.name || "Untitled project").trim(),
    }));
  }, [projectsQuery.data?.data?.projects]);

  const initialValue = scheduleQuery.data?.data?.schedule;
  const recipientOptions = useMemo(() => {
    const members = membersQuery.data?.data?.members || [];

    return members
      .map((entry) => {
        const user = entry?.userId;
        const id = String(user?._id || "").trim();
        const email = String(user?.email || "").trim().toLowerCase();
        const name = `${String(user?.firstName || "").trim()} ${String(
          user?.lastName || "",
        ).trim()}`.trim();

        if (!id || !email) {
          return null;
        }

        return {
          id,
          email,
          label: name || email,
        };
      })
      .filter(
        (entry): entry is { id: string; email: string; label: string } =>
          Boolean(entry),
      );
  }, [membersQuery.data?.data?.members]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            {isEditMode ? "Edit scheduled report" : "New scheduled report"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure when Squircle should generate intelligence summaries.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/settings/reports")}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">
            {isEditMode ? "Schedule settings" : "Create schedule"}
          </CardTitle>
          <CardDescription>
            Keep it compact and focused so every report remains actionable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditMode && scheduleQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-40" />
            </div>
          ) : (
            <WorkspaceReportScheduleForm
              mode={isEditMode ? "edit" : "create"}
              initialValue={initialValue}
              projectOptions={projectOptions}
              recipientOptions={recipientOptions}
              isSubmitting={isSubmitting}
              onSubmit={async (payload: CreateWorkspaceReportScheduleRequestBody) => {
                if (!normalizedWorkspaceId) {
                  return;
                }

                const request =
                  isEditMode && scheduleId
                    ? updateMutation.mutateAsync({
                        workspaceId: normalizedWorkspaceId,
                        scheduleId,
                        payload,
                      })
                    : createMutation.mutateAsync({
                        workspaceId: normalizedWorkspaceId,
                        payload,
                      });

                try {
                  await toast.promise(request, {
                    loading: isEditMode
                      ? "Saving report schedule..."
                      : "Creating report schedule...",
                    success: (response) =>
                      response?.data?.message ||
                      (isEditMode
                        ? "Report schedule saved successfully."
                        : "Report schedule created successfully."),
                    error: isEditMode
                      ? "We could not save this schedule."
                      : "We could not create this schedule.",
                  });

                  await Promise.all([
                    queryClient.invalidateQueries({
                      queryKey: ["workspace-report-schedules", normalizedWorkspaceId],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["workspace-reports", normalizedWorkspaceId],
                    }),
                  ]);

                  router.push("/settings/reports");
                } catch {
                  // Error handled by toast + mutation error handler.
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceReportScheduleEditor;

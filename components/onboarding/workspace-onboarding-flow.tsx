"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Link2,
  LoaderCircle,
  Video,
} from "lucide-react";

import useWorkspace from "@/hooks/use-workspace";
import useAuthStore from "@/stores/auth";
import useWorkspaceStore from "@/stores/workspace";
import type {
  WorkspaceOnboardingItemType,
  WorkspaceOnboardingState,
} from "@/types/workspace";
import { resolveUserStartRoute } from "@/lib/helpers/user-preferences";
import { ROUTES } from "@/utils/constants";
import Logo from "../shared/logo";
import LoaderComponent from "../shared/loader";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { cn } from "@/lib/utils";

const typeMeta: Record<
  WorkspaceOnboardingItemType,
  {
    label: string;
    icon: typeof BookOpen;
    badgeClassName: string;
  }
> = {
  doc: {
    label: "Doc",
    icon: BookOpen,
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  "knowledge-base": {
    label: "KB article",
    icon: GraduationCap,
    badgeClassName:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  video: {
    label: "Video",
    icon: Video,
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  link: {
    label: "Link",
    icon: Link2,
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

const getItemHref = (state: WorkspaceOnboardingState, itemId: string) => {
  const item = state.kit.items.find((entry) => entry.id === itemId);
  if (!item) {
    return "";
  }

  if (item.route) {
    return item.route;
  }

  if (item.type === "doc" && item.docId) {
    return `${ROUTES.DOCS}/${encodeURIComponent(item.docId)}`;
  }

  return item.url || "";
};

const WorkspaceOnboardingFlow = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const autoStartRef = useRef(false);

  const { user } = useAuthStore();
  const { workspaceId } = useWorkspaceStore();
  const resolvedWorkspaceId = useMemo(
    () => String(workspaceId || user?.currentWorkspaceId?._id || "").trim(),
    [workspaceId, user?.currentWorkspaceId?._id],
  );

  const workspaceHook = useWorkspace();
  const onboardingQuery = workspaceHook.useWorkspaceOnboarding(
    resolvedWorkspaceId,
    {
      enabled: !!resolvedWorkspaceId,
    },
  );

  const { mutateAsync: startOnboarding, isPending: isStarting } =
    workspaceHook.useStartWorkspaceOnboarding({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["workspace-onboarding", resolvedWorkspaceId],
        });
      },
    });

  const { mutateAsync: updateItemProgress, isPending: isUpdatingItem } =
    workspaceHook.useUpdateWorkspaceOnboardingItem({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["workspace-onboarding", resolvedWorkspaceId],
        });
      },
    });

  const { mutateAsync: completeOnboarding, isPending: isCompleting } =
    workspaceHook.useCompleteWorkspaceOnboarding({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: ["workspace-onboarding", resolvedWorkspaceId],
        });
      },
    });

  const onboarding = onboardingQuery.data?.data?.onboarding;

  useEffect(() => {
    if (!onboarding || autoStartRef.current) {
      return;
    }

    if (
      onboarding.isWorkspaceOwner ||
      !onboarding.kit.enabled ||
      onboarding.kit.items.length === 0 ||
      onboarding.progress.startedAt
    ) {
      return;
    }

    autoStartRef.current = true;
    void startOnboarding(resolvedWorkspaceId);
  }, [onboarding, resolvedWorkspaceId, startOnboarding]);

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const request = updateItemProgress({
      workspaceId: resolvedWorkspaceId,
      itemId,
      completed,
    });

    await toast.promise(request, {
      loading: completed
        ? "Marking item complete..."
        : "Updating onboarding progress...",
      success: "Onboarding progress updated",
      error: "Could not update onboarding progress",
    });
  };

  const handleComplete = async () => {
    const request = completeOnboarding(resolvedWorkspaceId);

    await toast.promise(request, {
      loading: "Completing onboarding...",
      success: "You are all set for this workspace",
      error: "Could not complete onboarding",
    });
  };

  const goToDashboard = () => {
    router.replace(
      resolveUserStartRoute({
        user,
        workspaceId: resolvedWorkspaceId,
      }),
    );
  };

  if (!resolvedWorkspaceId) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Empty className="border-border/55 bg-card/75 min-h-[26rem] rounded-2xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Select a workspace to continue</EmptyTitle>
            <EmptyDescription>
              Switch into a workspace first so we can load its onboarding kit.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href={ROUTES.SWITCH_WORKSPACE}
            className={buttonVariants({ size: "sm" })}
          >
            Switch workspace
          </Link>
        </Empty>
      </div>
    );
  }

  if (onboardingQuery.isLoading || !onboarding) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center py-16">
        <LoaderComponent />
      </div>
    );
  }

  if (!onboarding.kit.enabled || onboarding.kit.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-center pt-2">
          <Logo isFull />
        </div>
        <Empty className="border-border/55 bg-card/75 min-h-[26rem] rounded-2xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No onboarding kit configured</EmptyTitle>
            <EmptyDescription>
              There is nothing to complete for this workspace right now. You
              can head back to your dashboard.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={goToDashboard}>Go to dashboard</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-center pt-2">
        <Logo isFull />
      </div>

      <Card className="border-border/55 bg-card/75 rounded-2xl shadow-none">
        <CardHeader className="gap-3 border-b border-border/50 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit text-[11px]">
                {onboarding.workspaceName}
              </Badge>
              <div className="space-y-1">
                <CardTitle className="text-xl leading-tight">
                  {onboarding.kit.title}
                </CardTitle>
                <CardDescription className="max-w-2xl text-[12.5px]">
                  {onboarding.kit.description}
                </CardDescription>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {onboarding.progress.completedRequiredCount}/
                  {onboarding.progress.requiredCount || onboarding.progress.totalCount}
                  {" "}required
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/70">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, onboarding.progress.percentComplete || 0),
                    )}%`,
                  }}
                />
              </div>
              <p className="text-muted-foreground text-[11.5px]">
                {onboarding.isWorkspaceOwner
                  ? "Previewing the onboarding experience your new members will see."
                  : onboarding.progress.completedAt
                    ? "You’ve completed the required onboarding for this workspace."
                    : "Complete the required resources below, then finish onboarding."}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {onboarding.kit.items.map((item, index) => {
            const meta = typeMeta[item.type];
            const Icon = meta.icon;
            const href = getItemHref(onboarding, item.id);
            const isExternal = Boolean(item.url && !item.route);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/50 bg-background/50 p-3"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-muted-foreground text-[11px] font-medium">
                        Step {index + 1}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("gap-1.5 text-[11px]", meta.badgeClassName)}
                      >
                        <Icon className="size-3.5" />
                        {meta.label}
                      </Badge>
                      {item.required ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px]">
                          Optional
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[14px] font-semibold">
                        {item.title}
                      </div>
                      {item.description ? (
                        <p className="text-muted-foreground text-[12px]">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {href ? (
                      isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                          })}
                        >
                          <ExternalLink className="size-4" />
                          Open
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className={buttonVariants({
                            size: "sm",
                            variant: "outline",
                          })}
                        >
                          <ArrowRight className="size-4" />
                          Open
                        </Link>
                      )
                    ) : null}

                    {!onboarding.isWorkspaceOwner ? (
                      <Button
                        size="sm"
                        variant={item.completed ? "secondary" : "default"}
                        disabled={isUpdatingItem}
                        onClick={() =>
                          handleToggleItem(item.id, item.completed !== true)
                        }
                      >
                        {isUpdatingItem ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        {item.completed ? "Completed" : "Mark complete"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={goToDashboard}>
          Back to dashboard
        </Button>
        {!onboarding.isWorkspaceOwner ? (
          <Button
            disabled={
              !onboarding.progress.allRequiredCompleted || isCompleting || isStarting
            }
            onClick={async () => {
              await handleComplete();
              goToDashboard();
            }}
          >
            Finish onboarding
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default WorkspaceOnboardingFlow;

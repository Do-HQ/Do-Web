"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  RefreshCw,
  Settings,
  UsersRound,
} from "lucide-react";

import useWorkspaceStandup from "@/hooks/use-workspace-standup";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspaceStore from "@/stores/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { recordRecentVisit } from "@/lib/helpers/recent-visits";
import { ROUTES } from "@/utils/constants";
import { formatStandupDateTime, statusClassName } from "./standup-utils";
import { cn } from "@/lib/utils";

const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Card className="rounded-sm border-border/70">
    <CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </CardContent>
  </Card>
);

const WorkspaceStandupsPage = () => {
  const { workspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const standup = useWorkspaceStandup();
  const overviewQuery = standup.useStandupOverview(normalizedWorkspaceId, {
    enabled: !!normalizedWorkspaceId && permissions.isAdminLike,
  });

  useEffect(() => {
    if (!normalizedWorkspaceId || !permissions.isAdminLike) return;
    recordRecentVisit({
      key: "standups:overview",
      kind: "standup",
      href: ROUTES.STANDUPS,
      workspaceId: normalizedWorkspaceId,
    });
  }, [normalizedWorkspaceId, permissions.isAdminLike]);

  if (!permissions.isAdminLike) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4">
        <Empty className="rounded-sm border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Standups are managed by admins</EmptyTitle>
            <EmptyDescription>
              Only workspace owners and admins can view standup responses and
              settings.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (overviewQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const overview = overviewQuery.data?.data;
  const current = overview?.currentSession;
  const metrics = current?.metrics;
  const recent = overview?.recentSessions || [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Standups</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track today’s submissions, missed updates, blockers, and team
            readiness.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => overviewQuery.refetch()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Link href={ROUTES.SETTINGS_STANDUP}>
            <Button>
              <Settings />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {current ? (
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="Completion"
            value={`${metrics?.completionRate || 0}%`}
          />
          <StatCard label="Submitted" value={metrics?.submitted || 0} />
          <StatCard
            label="Pending"
            value={(metrics?.pending || 0) + (metrics?.inProgress || 0)}
          />
          <StatCard label="Missed" value={metrics?.missed || 0} />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-sm">
                No open standup right now
              </h2>
              <p className="text-xs text-muted-foreground">
                Next standup opens{" "}
                {formatStandupDateTime(overview?.nextStandup?.opensAt)}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-none p-0">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm">Recent standups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-0 pt-0">
          {recent.length ? (
            recent.map((session) => (
              <Link
                key={session.id}
                href={`${ROUTES.STANDUPS}/${session.id}`}
                className="grid gap-3 rounded-sm border border-border/70 p-4 transition hover:bg-muted/40 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {formatStandupDateTime(session.opensAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Window closed {formatStandupDateTime(session.closesAt)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(statusClassName(session.status), "capitalize")}
                >
                  {session.status?.toLowerCase()}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <UsersRound className="size-4" />{" "}
                  {session.metrics?.submitted || 0}/
                  {session.metrics?.totalParticipants || 0}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart3 className="size-4" />{" "}
                  {session.metrics?.completionRate || 0}%
                </div>
              </Link>
            ))
          ) : (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardCheck className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Standups will appear here</EmptyTitle>
                <EmptyDescription>
                  Standups will appear here once the first scheduled check-in
                  begins.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceStandupsPage;

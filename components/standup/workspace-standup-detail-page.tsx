"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import useWorkspaceStandup from "@/hooks/use-workspace-standup";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspaceStore from "@/stores/workspace";
import type { StandupAnswer, StandupSummary } from "@/types/standup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { recordRecentVisit } from "@/lib/helpers/recent-visits";
import { ROUTES } from "@/utils/constants";
import {
  formatStandupDateTime,
  humanize,
  statusClassName,
} from "./standup-utils";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

const answerToText = (value: StandupAnswer["answerValue"] | unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object") {
    return Object.values(value)
      .map((entry) => answerToText(entry))
      .filter(Boolean)
      .join(" - ");
  }
  if (value === null || typeof value === "undefined" || value === "")
    return "No answer yet";
  return String(value);
};

const summaryText = (value: unknown, fallback: string) => {
  const text = answerToText(value);
  return text && text !== "No answer yet" ? text : fallback;
};

const summaryList = (value: unknown) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((entry) => summaryText(entry, ""))
    .filter(Boolean);

const SummaryPanel = ({
  summary,
}: {
  summary?: StandupSummary["aiSummary"] | null;
}) => {
  if (!summary) return null;
  return (
    <div className="grid gap-3 text-[13px] leading-5 text-muted-foreground md:grid-cols-2">
      <section>
        <h3 className="mb-1 font-semibold text-foreground">Overview</h3>
        <p>{summaryText(summary.overview, "No overview available.")}</p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold text-foreground">Readiness</h3>
        <p>
          {summaryText(summary.teamReadiness, "No readiness signal available.")}
        </p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold text-foreground">Progress</h3>
        <p>{summaryText(summary.progress, "No progress summary available.")}</p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold text-foreground">Blockers</h3>
        <p>{summaryText(summary.blockers, "No blockers reported.")}</p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold text-foreground">Risks</h3>
        <p>{summaryText(summary.risks, "No risks reported.")}</p>
      </section>
      <section>
        <h3 className="mb-1 font-semibold text-foreground">
          Recommended actions
        </h3>
        <ul className="list-disc space-y-1 pl-4">
          {summaryList(summary.recommendedActions).length ? (
            summaryList(summary.recommendedActions).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))
          ) : (
            <li>No recommended actions yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
};

const WorkspaceStandupDetailPage = ({ sessionId }: { sessionId: string }) => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const standup = useWorkspaceStandup();
  const detailQuery = standup.useStandupSessionDetail(
    normalizedWorkspaceId,
    sessionId,
    {
      enabled:
        !!normalizedWorkspaceId && !!sessionId && permissions.isAdminLike,
    },
  );
  const summarizeMutation = standup.useSummarizeStandupSession();
  const summarizeParticipantMutation = standup.useSummarizeStandupParticipant();
  const [participantSearch, setParticipantSearch] = useState("");

  useEffect(() => {
    if (!normalizedWorkspaceId || !sessionId || !permissions.isAdminLike)
      return;
    recordRecentVisit({
      key: `standup-session:${sessionId}`,
      kind: "standup-session",
      href: `${ROUTES.STANDUPS}/${sessionId}`,
      workspaceId: normalizedWorkspaceId,
    });
  }, [normalizedWorkspaceId, permissions.isAdminLike, sessionId]);

  const data = detailQuery.data?.data;
  const participantSearchTerm = participantSearch.trim().toLowerCase();
  const filteredParticipants = useMemo(() => {
    const participants = data?.participants || [];
    if (!participantSearchTerm) {
      return participants;
    }

    return participants.filter((participant) => {
      const name = String(participant.user?.name || "").toLowerCase();
      const email = String(participant.user?.email || "").toLowerCase();
      return (
        name.includes(participantSearchTerm) ||
        email.includes(participantSearchTerm)
      );
    });
  }, [data?.participants, participantSearchTerm]);

  if (!permissions.isAdminLike) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Admin access required</EmptyTitle>
            <EmptyDescription>
              Only workspace owners and admins can view standup responses.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-[540px] rounded-lg" />
      </div>
    );
  }

  if (!data?.session) {
    return (
      <div className="p-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Standup not found</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const sessionSummary = data.summary?.aiSummary;

  const refetchDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["standup-session-detail", normalizedWorkspaceId, sessionId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["standup-overview", normalizedWorkspaceId],
    });
  };

  const handleSummarizeSession = async () => {
    const request = summarizeMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      sessionId,
    });
    try {
      await toast.promise(request, {
        loading: "Summarizing workspace standup with Scribe...",
        success: "Workspace standup summary is ready.",
        error: "We could not summarize this standup.",
      });
      await refetchDetail();
    } catch {}
  };

  const handleSummarizeParticipant = async (
    participantId: string,
    name = "this member",
  ) => {
    const request = summarizeParticipantMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      sessionId,
      participantId,
    });
    try {
      await toast.promise(request, {
        loading: `Summarizing ${name}'s standup with Scribe...`,
        success: `${name}'s summary is ready.`,
        error: "We could not summarize this member's standup.",
      });
      await refetchDetail();
    } catch {}
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={ROUTES.STANDUPS}>
            <Button size="sm" variant="ghost" className="mb-1 px-0">
              <ArrowLeft className="size-4" /> Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            Standup session
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {formatStandupDateTime(data.session.opensAt)} · closes{" "}
            {formatStandupDateTime(data.session.closesAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => detailQuery.refetch()}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSummarizeSession}
            disabled={summarizeMutation.isPending}
          >
            <Star className="size-4" /> Summarize all
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        {[
          ["Completion", `${data.metrics.completionRate}%`],
          ["Submitted", data.metrics.submitted],
          ["Pending", data.metrics.pending],
          ["In progress", data.metrics.inProgress],
          ["Missed", data.metrics.missed],
        ].map(([label, value]) => (
          <Card key={label} className="border-border/70">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessionSummary ? (
        <Card className="border-border/70">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">
              {sessionSummary.title || "Workspace standup summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <SummaryPanel summary={sessionSummary} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70">
        <CardHeader className="gap-3 p-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Participant standups</CardTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Search by person and open each standup when you need the full
                answers.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                placeholder="Search people"
                className="h-9 pl-8 text-[13px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 pt-0">
          {filteredParticipants.length ? (
            filteredParticipants.map((participant) => {
              const answerByQuestionId = new Map(
                (participant.answers || []).map((answer) => [
                  answer.questionId,
                  answer,
                ]),
              );
              const questions = participant.questions || [];
              const answeredCount = participant.answers?.length || 0;
              const memberName = participant.user?.name || "Workspace member";

              return (
                <Collapsible
                  key={participant.id}
                  className="border border-border/70 bg-card"
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full flex-col gap-3 px-3 py-3 text-left transition hover:bg-muted/25 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          userCard={{
                            name: memberName,
                            email: participant.user?.email,
                          }}
                          size="sm"
                        >
                          {participant.user?.avatarUrl ? (
                            <AvatarImage
                              src={participant.user.avatarUrl}
                              alt=""
                            />
                          ) : null}
                          <AvatarFallback>
                            {initials(memberName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {memberName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {participant.user?.email || "No email"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge
                          variant="outline"
                          className={statusClassName(participant.status)}
                        >
                          {humanize(participant.status)}
                        </Badge>
                        <span className="rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                          {answeredCount}/{questions.length} answered
                        </span>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="space-y-3 border-t border-border/60 p-3">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleSummarizeParticipant(
                              participant.id,
                              memberName,
                            )
                          }
                          disabled={
                            summarizeParticipantMutation.isPending ||
                            !questions.length
                          }
                        >
                          <Star className="size-4" /> Summarize person
                        </Button>
                      </div>

                      {participant.summary?.aiSummary ? (
                        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                          <p className="mb-2 text-sm font-semibold">
                            {participant.summary.aiSummary.title ||
                              `${memberName} summary`}
                          </p>
                          <SummaryPanel
                            summary={participant.summary.aiSummary}
                          />
                        </div>
                      ) : null}

                      {questions.length ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {questions.map((question) => {
                            const answer = answerByQuestionId.get(question.id);
                            return (
                              <div
                                key={question.id}
                                className="rounded-lg bg-muted/35 p-3 text-[13px]"
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <p className="font-medium text-foreground">
                                    {humanize(question.questionType)}
                                  </p>
                                  {question.aiGenerated ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-md text-[10px]"
                                    >
                                      Scribe
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-foreground">
                                  {question.prompt}
                                </p>
                                {question.relatedEntityTitle ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {question.relatedEntityTitle}
                                  </p>
                                ) : null}
                                <p className="mt-2 text-muted-foreground">
                                  {answerToText(answer?.answerValue)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-lg bg-muted/30 p-3 text-[13px] text-muted-foreground">
                          Questions have not been generated for this participant
                          yet.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-sm">
              No standups match this search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceStandupDetailPage;

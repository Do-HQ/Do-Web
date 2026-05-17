"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  ListChecks,
  MessageSquareText,
  PersonStanding,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import useWorkspaceStandup from "@/hooks/use-workspace-standup";
import useWorkspaceStore from "@/stores/workspace";
import type { StandupAnswer, StandupQuestion } from "@/types/standup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { recordRecentVisit } from "@/lib/helpers/recent-visits";
import { cn } from "@/lib/utils";
import StandupAiAvailabilityNote from "./standup-ai-availability-note";
import { formatStandupDateTime, humanize } from "./standup-utils";

const answerForQuestion = (answers: StandupAnswer[], questionId: string) =>
  answers.find((answer) => answer.questionId === questionId)?.answerValue;

const answerToText = (value: StandupAnswer["answerValue"] | unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || typeof value === "undefined" || value === "")
    return "No answer yet";
  return String(value);
};

const StandupQuestionInput = ({
  question,
  value,
  onChange,
}: {
  question: StandupQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  if (
    ["SINGLE_CHOICE", "STATUS_SELECT", "ACKNOWLEDGEMENT"].includes(
      question.answerMode,
    )
  ) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition hover:border-foreground/40",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 bg-card",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.answerMode === "BOOLEAN") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={value === true ? "default" : "outline"}
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          size="sm"
          variant={value === false ? "default" : "outline"}
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Textarea
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Write a short update..."
      className="min-h-28 resize-none rounded-lg text-[13px]"
    />
  );
};

const WorkspaceStandupPage = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceStore();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  const standup = useWorkspaceStandup();
  const currentQuery = standup.useCurrentStandup(normalizedWorkspaceId, {
    enabled: !!normalizedWorkspaceId,
  });
  const startMutation = standup.useStartCurrentStandup();
  const answerMutation = standup.useAnswerCurrentStandup();
  const submitMutation = standup.useSubmitCurrentStandup();
  const data = currentQuery.data?.data;
  const questions = data?.questions || [];
  const answers = data?.answers || [];
  const attentionSummary = data?.attentionSummary;
  const [activeIndex, setActiveIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [optimisticStarted, setOptimisticStarted] = useState(false);
  const [optimisticSubmitted, setOptimisticSubmitted] = useState(false);

  useEffect(() => {
    if (!normalizedWorkspaceId) return;
    recordRecentVisit({
      key: "standup:current",
      kind: "standup",
      href: "/standup",
      workspaceId: normalizedWorkspaceId,
    });
  }, [normalizedWorkspaceId]);

  useEffect(() => {
    if (questions.length && activeIndex > questions.length - 1) {
      setActiveIndex(questions.length - 1);
    }
  }, [activeIndex, questions.length]);

  useEffect(() => {
    setOptimisticStarted(false);
    setOptimisticSubmitted(false);
    setDrafts({});
    setActiveIndex(0);
  }, [data?.participant?.id]);

  const activeQuestion = questions[activeIndex];
  const progress = questions.length
    ? Math.round(((activeIndex + 1) / questions.length) * 100)
    : 0;
  const isSubmitted =
    data?.participant?.status === "SUBMITTED" || optimisticSubmitted;
  const isMissed = data?.participant?.status === "MISSED";
  const hasStarted = Boolean(
    optimisticStarted ||
      data?.participant?.startedAt ||
      data?.participant?.status === "IN_PROGRESS",
  );

  const currentValue = useMemo(() => {
    if (!activeQuestion) return undefined;
    if (Object.prototype.hasOwnProperty.call(drafts, activeQuestion.id))
      return drafts[activeQuestion.id];
    return answerForQuestion(answers, activeQuestion.id) ?? "";
  }, [activeQuestion, answers, drafts]);

  const invalidateCurrent = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["standup-current", normalizedWorkspaceId],
    });
  };

  const handleStart = async () => {
    const request = startMutation.mutateAsync(normalizedWorkspaceId);
    try {
      const response = await toast.promise(request, {
        loading: "Opening your standup...",
        success: "Standup opened.",
        error: "We could not start your standup.",
      });
      setOptimisticStarted(true);
      queryClient.setQueryData(
        ["standup-current", normalizedWorkspaceId],
        response,
      );
      void invalidateCurrent();
    } catch {}
  };

  const handleSaveAndNext = async () => {
    if (!activeQuestion) return;
    const value = currentValue;
    if (
      activeQuestion.required &&
      (value === "" || value === undefined || value === null)
    ) {
      toast.error("This question is required");
      return;
    }

    const request = answerMutation.mutateAsync({
      workspaceId: normalizedWorkspaceId,
      questionId: activeQuestion.id,
      answerValue: value,
    });
    try {
      await toast.promise(request, {
        loading: "Saving answer...",
        success:
          activeIndex < questions.length - 1
            ? "Saved. Next question ready."
            : "Saved.",
        error: "We could not save this answer.",
      });
      await invalidateCurrent();
      if (activeIndex < questions.length - 1)
        setActiveIndex((index) => index + 1);
    } catch {}
  };

  const handleSubmit = async () => {
    const request = (async () => {
      if (activeQuestion) {
        const value = currentValue;
        const hasDraftForActive = Object.prototype.hasOwnProperty.call(
          drafts,
          activeQuestion.id,
        );
        const hasExistingAnswer =
          typeof answerForQuestion(answers, activeQuestion.id) !== "undefined";

        if (
          activeQuestion.required &&
          (value === "" || value === undefined || value === null)
        ) {
          throw new Error("This question is required");
        }

        if (
          activeQuestion.required ||
          hasDraftForActive ||
          hasExistingAnswer
        ) {
          await answerMutation.mutateAsync({
            workspaceId: normalizedWorkspaceId,
            questionId: activeQuestion.id,
            answerValue: value,
          });
        }
      }

      const response = await submitMutation.mutateAsync(normalizedWorkspaceId);
      return response;
    })();

    try {
      const response = await toast.promise(request, {
        loading: "Saving final answer and submitting...",
        success: "Standup submitted. You’re all set.",
        error: (error: Error) =>
          error?.message || "We could not submit your standup.",
      });
      setDrafts({});
      setOptimisticSubmitted(true);
      queryClient.setQueryData(
        ["standup-current", normalizedWorkspaceId],
        response,
      );
      void invalidateCurrent();
    } catch {}
  };

  if (currentQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    );
  }

  if (!data?.session || !data?.participant) {
    return (
      <div className="mx-auto flex w-full max-w-2xl p-4">
        <Empty className="w-full border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No active standup</EmptyTitle>
            <EmptyDescription>
              You do not have an active standup right now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (isSubmitted) {
    const answerMap = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
        <StandupAiAvailabilityNote workspaceId={normalizedWorkspaceId} />
        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Check className="size-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  You’re all set
                </h1>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                  Scribe captured your standup. Your admins can now review the
                  update alongside the workspace overview.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Questions</p>
                <p className="mt-1 font-semibold">{questions.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Answered</p>
                <p className="mt-1 font-semibold">{answers.length}</p>
              </div>
              <div className="rounded-lg border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Window closes</p>
                <p className="mt-1 text-sm font-medium">
                  {formatStandupDateTime(data.session.closesAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="size-4" /> Standup recap
            </div>
            {questions.map((question) => {
              const answer = answerMap.get(question.id);
              return (
                <div
                  key={question.id}
                  className="rounded-lg border border-border/70 p-3 text-[13px]"
                >
                  <p className="font-medium text-foreground">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {answerToText(answer?.answerValue)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="size-4" />
                Tags to review
              </div>
              <Badge variant="secondary" className="rounded-md">
                {attentionSummary?.count || 0}
              </Badge>
            </div>
            <p className="text-[13px] leading-5 text-muted-foreground">
              {attentionSummary?.overview ||
                "You do not have unread tags waiting right now."}
            </p>
            {attentionSummary?.items?.length ? (
              <div className="space-y-2">
                {attentionSummary.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.route || "#"}
                    className={cn(
                      "block rounded-lg border border-border/70 p-3 text-[13px] transition hover:border-foreground/40 hover:bg-muted/30",
                      !item.route && "pointer-events-none",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">
                        {item.targetLabel || item.title}
                      </p>
                      <Badge variant="outline" className="rounded-md text-[10px]">
                        {humanize(item.type)}
                      </Badge>
                    </div>
                    {item.summary ? (
                      <p className="mt-1 text-muted-foreground">
                        {item.summary}
                      </p>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isMissed) {
    return (
      <div className="mx-auto flex w-full max-w-2xl p-4">
        <Empty className="w-full border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>This standup window has closed</EmptyTitle>
            <EmptyDescription>
              You can answer the next standup when it opens.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
        <StandupAiAvailabilityNote workspaceId={normalizedWorkspaceId} />
        <Card className="w-full overflow-hidden border-border/70 ">
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_0.75fr]">
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Your standup is ready
                </h1>
                <p className="mt-2 max-w-xl text-[13px] leading-5 text-muted-foreground">
                  Scribe prepared a focused check-in from your tasks, blockers,
                  and open work. After you submit, Scribe will show unread tags
                  and follow-ups for review.
                </p>
              </div>
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="rounded-lg"
              >
                Start standup
              </Button>
            </div>
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Clock3 className="size-4" /> Window closes
              </div>
              <p>{formatStandupDateTime(data.session.closesAt)}</p>
              <p>
                Scribe will ask one question at a time. You can go back before
                submitting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
      <StandupAiAvailabilityNote workspaceId={normalizedWorkspaceId} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Standup</p>
          <h1 className="text-lg font-semibold tracking-tight">
            Question {activeIndex + 1} of {questions.length}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Closes {formatStandupDateTime(data.session.closesAt)}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {activeQuestion ? (
        <Card className="min-h-[380px] border-border/70">
          <CardContent className="flex min-h-[380px] flex-col justify-between gap-5 p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <PersonStanding className="size-3.5" />{" "}
                {humanize(activeQuestion.questionType)}
              </div>
              {activeQuestion.relatedEntityTitle ? (
                <p className="text-[13px] font-medium text-muted-foreground">
                  {activeQuestion.relatedEntityTitle}
                </p>
              ) : null}
              <h2 className="max-w-2xl text-xl font-semibold leading-snug tracking-tight">
                {activeQuestion.prompt}
              </h2>
              {activeQuestion.description ? (
                <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground">
                  {activeQuestion.description}
                </p>
              ) : null}
              <StandupQuestionInput
                question={activeQuestion}
                value={currentValue}
                onChange={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [activeQuestion.id]: value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setActiveIndex((index) => Math.max(0, index - 1))
                }
                disabled={activeIndex === 0}
              >
                <ChevronLeft className="size-4" /> Back
              </Button>
              {activeIndex === questions.length - 1 ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveAndNext}
                    disabled={answerMutation.isPending || submitMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={answerMutation.isPending || submitMutation.isPending}
                  >
                    <Send className="size-4" /> Submit
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSaveAndNext}
                  disabled={answerMutation.isPending || submitMutation.isPending}
                >
                  Save and next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default WorkspaceStandupPage;

"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GitBranch,
  Goal,
  SlidersHorizontal,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import LoaderComponent from "@/components/shared/loader";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useWorkspacePortfolio from "@/hooks/use-workspace-portfolio";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import useWorkspaceProject from "@/hooks/use-workspace-project";
import useWorkspaceTeam from "@/hooks/use-workspace-team";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import useWorkspaceStore from "@/stores/workspace";
import { ProjectInfoTip } from "@/components/projects/overview/components/project-info-tip";
import {
  ApprovalRequestRecord,
  CapacityMemberRow,
  CapacityRecommendationRow,
  CapacityTeamRow,
  PortfolioDependencyNode,
  PortfolioDependencyRecord,
  PortfolioExecutiveSummary,
  PortfolioHealthRow,
  PortfolioOkrCycle,
  PortfolioSimulationImpactRow,
  PortfolioVelocityRow,
} from "@/types/portfolio";

const portfolioQueryPrefix = {
  summary: "workspace-portfolio-summary",
  health: "workspace-portfolio-health",
  velocity: "workspace-portfolio-velocity",
  okrs: "workspace-portfolio-okr-cycles",
  dependencies: "workspace-portfolio-dependencies",
  graph: "workspace-portfolio-dependency-graph",
  criticalPath: "workspace-portfolio-critical-path",
  capacity: "workspace-portfolio-capacity",
  approvalPolicy: "workspace-portfolio-approval-policy",
  approvalRequests: "workspace-portfolio-approval-requests",
} as const;

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const metricIntentClassName = (intent: "good" | "warn" | "bad" | "info") => {
  if (intent === "good") {
    return "text-emerald-500";
  }
  if (intent === "warn") {
    return "text-amber-500";
  }
  if (intent === "bad") {
    return "text-destructive";
  }
  return "text-primary";
};

const metricIntentTrackClassName = (
  intent: "good" | "warn" | "bad" | "info",
) => {
  if (intent === "good") {
    return "stroke-emerald-500";
  }
  if (intent === "warn") {
    return "stroke-amber-500";
  }
  if (intent === "bad") {
    return "stroke-destructive";
  }
  return "stroke-primary";
};

const CircularMetric = ({
  label,
  value,
  helper,
  intent = "info",
}: {
  label: string;
  value: number;
  helper: string;
  intent?: "good" | "warn" | "bad" | "info";
}) => {
  const normalized = clampPercent(value);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="rounded-lg border border-border/35 bg-muted/20 p-3">
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 60 60"
            className="-rotate-90 h-14 w-14"
            aria-label={`${label} ${normalized}%`}
          >
            <circle
              cx="30"
              cy="30"
              r={radius}
              className="stroke-muted/45 fill-none"
              strokeWidth="6"
            />
            <circle
              cx="30"
              cy="30"
              r={radius}
              className={cn(
                "fill-none transition-all duration-500 ease-out",
                metricIntentTrackClassName(intent),
              )}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
          <span
            className={cn(
              "absolute text-[11px] font-semibold",
              metricIntentClassName(intent),
            )}
          >
            {normalized}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium">{label}</p>
          <p className="text-muted-foreground text-[11px]">{helper}</p>
        </div>
      </div>
    </div>
  );
};

const VelocityLineChart = ({
  rows,
  className,
}: {
  rows: PortfolioVelocityRow[];
  className?: string;
}) => {
  if (!rows.length) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-[11rem] items-center justify-center text-[11px]",
          className,
        )}
      >
        No velocity points yet.
      </div>
    );
  }

  const width = 720;
  const height = 190;
  const leftPadding = 20;
  const rightPadding = 14;
  const topPadding = 16;
  const bottomPadding = 30;
  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = height - topPadding - bottomPadding;
  const maxValue = Math.max(
    1,
    ...rows.map((row) =>
      Number.isFinite(row.completedTasks) ? row.completedTasks : 0,
    ),
  );

  const points = rows.map((row, index) => {
    const denominator = Math.max(1, rows.length - 1);
    const x = leftPadding + (plotWidth * index) / denominator;
    const y =
      topPadding +
      plotHeight -
      ((Number(row.completedTasks) || 0) / maxValue) * plotHeight;
    return { x, y, label: row.weekLabel, value: row.completedTasks };
  });

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(2)} ${(height - bottomPadding + 1).toFixed(2)} L ${points[0]?.x.toFixed(2)} ${(height - bottomPadding + 1).toFixed(2)} Z`;

  return (
    <div className={cn("rounded-lg border border-border/35 bg-muted/15 p-2", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[12rem] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Velocity trend chart"
      >
        <defs>
          <linearGradient
            id="velocityAreaGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.02)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((step) => {
          const y = topPadding + plotHeight * step;
          return (
            <line
              key={step}
              x1={leftPadding}
              x2={width - rightPadding}
              y1={y}
              y2={y}
              className="stroke-border/40"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path d={areaPath} fill="url(#velocityAreaGradient)" />
        <path
          d={linePath}
          className="stroke-primary fill-none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3.8"
              className="fill-background stroke-primary"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground sm:grid-cols-4 md:grid-cols-6">
        {points.map((point) => (
          <div key={point.label} className="truncate">
            {point.label}: {point.value}
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkspacePortfolio = () => {
  const { workspaceId } = useWorkspaceStore();
  const workspacePermissions = useWorkspacePermissions();
  const isAdminLike = workspacePermissions.isAdminLike;
  const queryClient = useQueryClient();
  const { useWorkspaceProjects, useWorkspaceProjectDetail } =
    useWorkspaceProject();
  const { useWorkspaceTeams } = useWorkspaceTeam();
  const {
    useWorkspacePortfolioSummary,
    useWorkspacePortfolioHealth,
    useWorkspacePortfolioVelocity,
    useWorkspaceOkrCycles,
    useWorkspaceTaskDependencies,
    useWorkspaceDependencyGraph,
    useWorkspaceCriticalPath,
    useWorkspaceCapacityOverview,
    useWorkspaceApprovalPolicy,
    useWorkspaceApprovalRequests,
    useCreateWorkspaceOkrCycle,
    useCreateWorkspaceOkrObjective,
    useCheckInWorkspaceOkrKeyResult,
    useCreateWorkspaceTaskDependency,
    useDeleteWorkspaceTaskDependency,
    useSimulateWorkspaceDependencyImpact,
    useUpdateWorkspacePlanningConfig,
    useUpsertWorkspaceMemberCapacity,
    useUpdateWorkspaceApprovalPolicy,
    useApproveWorkspaceApprovalRequest,
    useRejectWorkspaceApprovalRequest,
  } = useWorkspacePortfolio();

  const [projectFilter, setProjectFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("all");
  const [horizonDays, setHorizonDays] = React.useState("30");
  const [approvalStatusFilter, setApprovalStatusFilter] =
    React.useState("pending");
  const [activeTab, setActiveTab] = React.useState<
    | "executive"
    | "okrs"
    | "health"
    | "velocity"
    | "dependencies"
    | "capacity"
    | "approvals"
  >("executive");
  const [selectedDependencyProject, setSelectedDependencyProject] =
    React.useState("");
  const [sourceTaskId, setSourceTaskId] = React.useState("");
  const [targetTaskId, setTargetTaskId] = React.useState("");
  const [lagDays, setLagDays] = React.useState("0");
  const [simulationTaskId, setSimulationTaskId] = React.useState("");
  const [simulationShiftDays, setSimulationShiftDays] = React.useState("1");
  const [okrCycleName, setOkrCycleName] = React.useState("");
  const [okrCycleStart, setOkrCycleStart] = React.useState("");
  const [okrCycleEnd, setOkrCycleEnd] = React.useState("");
  const [okrCycleDialogOpen, setOkrCycleDialogOpen] = React.useState(false);
  const [okrObjectiveCycleId, setOkrObjectiveCycleId] = React.useState("");
  const [okrObjectiveTitle, setOkrObjectiveTitle] = React.useState("");
  const [okrObjectiveDescription, setOkrObjectiveDescription] =
    React.useState("");
  const [okrObjectiveDialogOpen, setOkrObjectiveDialogOpen] =
    React.useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = React.useState(false);
  const [approvalPolicyDialogOpen, setApprovalPolicyDialogOpen] =
    React.useState(false);
  const [checkInValues, setCheckInValues] = React.useState<
    Record<string, string>
  >({});
  const [capacityEdits, setCapacityEdits] = React.useState<
    Record<string, string>
  >({});
  const [capacitySearch, setCapacitySearch] = React.useState("");
  const [capacityTeamFilter, setCapacityTeamFilter] = React.useState("all");
  const [capacityPage, setCapacityPage] = React.useState(1);
  const [capacityPageSize, setCapacityPageSize] = React.useState("10");
  const [approvalPolicyDraft, setApprovalPolicyDraft] = React.useState<{
    riskResolveClose: boolean;
    secretsMutations: boolean;
    docsPublishing: boolean;
    workflowStageChanges: boolean;
  } | null>(null);
  const debouncedCapacitySearch = useDebounce(capacitySearch, 350);

  const projectsQuery = useWorkspaceProjects(workspaceId || "", {
    page: 1,
    limit: 100,
    search: "",
    archived: false,
  });
  const teamsQuery = useWorkspaceTeams(workspaceId || "", {
    page: 1,
    limit: 100,
    search: "",
    status: "active",
  });

  const summaryQuery = useWorkspacePortfolioSummary(workspaceId || "", {
    projectId: projectFilter === "all" ? "" : projectFilter,
    teamId: teamFilter === "all" ? "" : teamFilter,
  });
  const healthQuery = useWorkspacePortfolioHealth(workspaceId || "", {
    projectId: projectFilter === "all" ? "" : projectFilter,
  });
  const velocityQuery = useWorkspacePortfolioVelocity(workspaceId || "", {
    projectId: projectFilter === "all" ? "" : projectFilter,
  });
  const okrCyclesQuery = useWorkspaceOkrCycles(workspaceId || "", {
    status: "all",
  });
  const dependenciesQuery = useWorkspaceTaskDependencies(workspaceId || "", {
    projectId: selectedDependencyProject,
  });
  const dependencyGraphQuery = useWorkspaceDependencyGraph(
    workspaceId || "",
    { projectId: selectedDependencyProject || "" },
    { enabled: !!selectedDependencyProject },
  );
  const criticalPathQuery = useWorkspaceCriticalPath(
    workspaceId || "",
    { projectId: selectedDependencyProject || "" },
    { enabled: !!selectedDependencyProject },
  );
  const capacityQuery = useWorkspaceCapacityOverview(workspaceId || "", {
    horizonDays: Number(horizonDays) || 30,
    search: debouncedCapacitySearch,
    teamId: capacityTeamFilter === "all" ? "" : capacityTeamFilter,
    page: capacityPage,
    limit: Number(capacityPageSize) || 10,
  });
  const approvalPolicyQuery = useWorkspaceApprovalPolicy(workspaceId || "", {
    enabled: isAdminLike,
  });
  const approvalRequestsQuery = useWorkspaceApprovalRequests(
    workspaceId || "",
    {
      page: 1,
      limit: 25,
      status:
        approvalStatusFilter === "all"
          ? "all"
          : (approvalStatusFilter as
              | "pending"
              | "approved"
              | "rejected"
              | "applied"
              | "failed"),
    },
  );

  const selectedProjectDetailQuery = useWorkspaceProjectDetail(
    workspaceId || "",
    selectedDependencyProject,
    { enabled: !!selectedDependencyProject },
  );

  const createOkrCycleMutation = useCreateWorkspaceOkrCycle({
    onSuccess: async () => {
      setOkrCycleName("");
      setOkrCycleStart("");
      setOkrCycleEnd("");
      setOkrCycleDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.okrs, workspaceId],
      });
    },
  });

  const createOkrObjectiveMutation = useCreateWorkspaceOkrObjective({
    onSuccess: async () => {
      setOkrObjectiveTitle("");
      setOkrObjectiveDescription("");
      setOkrObjectiveDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.okrs, workspaceId],
      });
    },
  });

  const checkInMutation = useCheckInWorkspaceOkrKeyResult({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.okrs, workspaceId],
      });
    },
  });

  const createDependencyMutation = useCreateWorkspaceTaskDependency({
    onSuccess: async () => {
      setSourceTaskId("");
      setTargetTaskId("");
      setLagDays("0");
      setDependencyDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.dependencies, workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.graph, workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.criticalPath, workspaceId],
        }),
      ]);
    },
  });

  const deleteDependencyMutation = useDeleteWorkspaceTaskDependency({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.dependencies, workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.graph, workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.criticalPath, workspaceId],
        }),
      ]);
    },
  });

  const simulateImpactMutation = useSimulateWorkspaceDependencyImpact();

  const updatePlanningMutation = useUpdateWorkspacePlanningConfig({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.summary, workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [portfolioQueryPrefix.capacity, workspaceId],
        }),
      ]);
    },
  });

  const upsertCapacityMutation = useUpsertWorkspaceMemberCapacity({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.capacity, workspaceId],
      });
    },
  });

  const updateApprovalPolicyMutation = useUpdateWorkspaceApprovalPolicy({
    onSuccess: async () => {
      setApprovalPolicyDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.approvalPolicy, workspaceId],
      });
    },
  });

  const approveRequestMutation = useApproveWorkspaceApprovalRequest({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.approvalRequests, workspaceId],
      });
    },
  });

  const rejectRequestMutation = useRejectWorkspaceApprovalRequest({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [portfolioQueryPrefix.approvalRequests, workspaceId],
      });
    },
  });

  const projects = React.useMemo(
    () => projectsQuery.data?.data?.projects || [],
    [projectsQuery.data?.data?.projects],
  );
  const teams = teamsQuery.data?.data?.teams || [];
  const teamNameById = React.useMemo(
    () =>
      new Map(teams.map((team) => [String(team._id || "").trim(), team.name])),
    [teams],
  );
  const summary: PortfolioExecutiveSummary | undefined =
    summaryQuery.data?.data?.summary;
  const healthRows: PortfolioHealthRow[] = healthQuery.data?.data?.rows || [];
  const velocityRows: PortfolioVelocityRow[] =
    velocityQuery.data?.data?.rows || [];
  const okrCycles: PortfolioOkrCycle[] =
    okrCyclesQuery.data?.data?.cycles || [];
  const dependencies: PortfolioDependencyRecord[] =
    dependenciesQuery.data?.data?.dependencies || [];
  const dependencyNodes: PortfolioDependencyNode[] =
    dependencyGraphQuery.data?.data?.nodes || [];
  const criticalPath = criticalPathQuery.data?.data?.criticalPath || [];
  const capacityMembers: CapacityMemberRow[] =
    capacityQuery.data?.data?.members || [];
  const capacityPlanning = capacityQuery.data?.data?.planning;
  const defaultWeeklyCapacityHours =
    Number(capacityPlanning?.defaultCapacityHoursPerWeek) || 40;
  const capacityPagination = capacityQuery.data?.data?.pagination;
  const capacityTeams: CapacityTeamRow[] =
    capacityQuery.data?.data?.teams || [];
  const capacityRecommendations: CapacityRecommendationRow[] =
    capacityQuery.data?.data?.recommendations || [];
  const approvalRequests: ApprovalRequestRecord[] =
    approvalRequestsQuery.data?.data?.requests || [];
  const approvalPolicy = approvalPolicyQuery.data?.data?.policy;
  const approvalPolicyItems = [
    { key: "riskResolveClose" as const, label: "Risk resolve / close" },
    { key: "secretsMutations" as const, label: "Secrets mutations" },
    { key: "docsPublishing" as const, label: "Docs publishing escalation" },
    { key: "workflowStageChanges" as const, label: "Workflow stage changes" },
  ];

  const executionActionRows = React.useMemo(() => {
    const risky = healthRows
      .filter(
        (row) =>
          row.overdueTasks > 0 || row.blockedTasks > 0 || row.healthScore < 65,
      )
      .sort((left, right) => left.healthScore - right.healthScore)
      .slice(0, 5);

    return risky;
  }, [healthRows]);

  const completedVelocityAverage = React.useMemo(() => {
    if (!velocityRows.length) {
      return 0;
    }
    const total = velocityRows.reduce(
      (sum, row) => sum + (Number(row.completedTasks) || 0),
      0,
    );
    return Math.round((total / velocityRows.length) * 10) / 10;
  }, [velocityRows]);

  const blockedRatio = React.useMemo(() => {
    if (!summary) {
      return 0;
    }
    const denominator = Math.max(1, summary.openTasks || summary.tasks || 1);
    return clampPercent((summary.blockedTasks / denominator) * 100);
  }, [summary]);

  const overdueRatio = React.useMemo(() => {
    if (!summary) {
      return 0;
    }
    const denominator = Math.max(1, summary.openTasks || summary.tasks || 1);
    return clampPercent((summary.overdueTasks / denominator) * 100);
  }, [summary]);

  const atRiskProjectCount = React.useMemo(
    () =>
      healthRows.filter(
        (row) =>
          row.healthScore < 65 || row.overdueTasks > 0 || row.blockedTasks > 0,
      ).length,
    [healthRows],
  );

  React.useEffect(() => {
    if (!projects.length) {
      setSelectedDependencyProject("");
      return;
    }
    if (!selectedDependencyProject) {
      setSelectedDependencyProject(projects[0]?.projectId || "");
    }
  }, [projects, selectedDependencyProject]);

  React.useEffect(() => {
    if (projectFilter !== "all") {
      setSelectedDependencyProject(projectFilter);
    }
  }, [projectFilter]);

  React.useEffect(() => {
    const policy = approvalPolicyQuery.data?.data?.policy;
    if (!policy) {
      return;
    }
    setApprovalPolicyDraft({
      riskResolveClose: Boolean(policy.riskResolveClose),
      secretsMutations: Boolean(policy.secretsMutations),
      docsPublishing: Boolean(policy.docsPublishing),
      workflowStageChanges: Boolean(policy.workflowStageChanges),
    });
  }, [approvalPolicyQuery.data]);

  React.useEffect(() => {
    setCapacityPage(1);
  }, [
    debouncedCapacitySearch,
    capacityTeamFilter,
    capacityPageSize,
    horizonDays,
  ]);

  const dependencyTasks = React.useMemo(() => {
    const record = selectedProjectDetailQuery.data?.data?.project?.record;
    const workflows = Array.isArray(record?.workflows) ? record.workflows : [];
    return workflows.flatMap((workflow) =>
      (Array.isArray(workflow?.tasks) ? workflow.tasks : []).map((task) => ({
        id: task.id,
        title: task.title,
        workflowId: workflow.id,
        workflowName: workflow.name,
      })),
    );
  }, [selectedProjectDetailQuery.data]);

  const dependencyTaskMetaById = React.useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        workflowName: string;
      }
    >();

    dependencyTasks.forEach((task) => {
      const taskId = String(task.id || "").trim();
      if (!taskId) {
        return;
      }

      map.set(taskId, {
        title: String(task.title || "").trim() || taskId,
        workflowName: String(task.workflowName || "").trim(),
      });
    });

    dependencyNodes.forEach((node) => {
      const taskId = String(node.taskId || "").trim();
      if (!taskId || map.has(taskId)) {
        return;
      }

      map.set(taskId, {
        title: String(node.title || "").trim() || taskId,
        workflowName: String(node.workflowName || "").trim(),
      });
    });

    return map;
  }, [dependencyNodes, dependencyTasks]);

  const isAnyTopLoading =
    projectsQuery.isLoading ||
    teamsQuery.isLoading ||
    summaryQuery.isLoading ||
    healthQuery.isLoading ||
    velocityQuery.isLoading;

  const handleCreateCycle = async () => {
    if (!isAdminLike) {
      toast.error("Only workspace owners or admins can create OKR cycles");
      return;
    }
    if (
      !workspaceId ||
      !okrCycleName.trim() ||
      !okrCycleStart ||
      !okrCycleEnd
    ) {
      toast.error("Cycle name, start and end date are required");
      return;
    }
    const request = createOkrCycleMutation.mutateAsync({
      workspaceId,
      payload: {
        name: okrCycleName.trim(),
        periodStart: okrCycleStart,
        periodEnd: okrCycleEnd,
      },
    });
    await toast.promise(request, {
      loading: "Creating OKR cycle...",
      success: "OKR cycle created",
      error: "Could not create OKR cycle.",
    });
  };

  const handleCreateObjective = async () => {
    if (!isAdminLike) {
      toast.error("Only workspace owners or admins can create objectives");
      return;
    }
    if (!workspaceId || !okrObjectiveCycleId || !okrObjectiveTitle.trim()) {
      toast.error("Pick a cycle and objective title");
      return;
    }
    const request = createOkrObjectiveMutation.mutateAsync({
      workspaceId,
      cycleId: okrObjectiveCycleId,
      payload: {
        title: okrObjectiveTitle.trim(),
        description: okrObjectiveDescription.trim(),
      },
    });
    await toast.promise(request, {
      loading: "Creating objective...",
      success: "Objective created",
      error: "Could not create objective.",
    });
  };

  const handleCheckIn = async (
    cycleId: string,
    objectiveId: string,
    keyResultId: string,
  ) => {
    if (!workspaceId) {
      return;
    }
    const key = `${cycleId}:${objectiveId}:${keyResultId}`;
    const numericValue = Number(checkInValues[key]);
    if (!Number.isFinite(numericValue)) {
      toast.error("Enter a valid numeric value");
      return;
    }

    const request = checkInMutation.mutateAsync({
      workspaceId,
      cycleId,
      objectiveId,
      keyResultId,
      payload: { value: numericValue },
    });
    await toast.promise(request, {
      loading: "Saving check-in...",
      success: "Check-in saved",
      error: "Could not save check-in.",
    });
  };

  const handleCreateDependency = async () => {
    if (
      !workspaceId ||
      !selectedDependencyProject ||
      !sourceTaskId ||
      !targetTaskId
    ) {
      toast.error("Select project, source task and target task");
      return;
    }
    const request = createDependencyMutation.mutateAsync({
      workspaceId,
      payload: {
        projectId: selectedDependencyProject,
        sourceTaskId,
        targetTaskId,
        lagDays: Number(lagDays) || 0,
      },
    });
    await toast.promise(request, {
      loading: "Adding dependency...",
      success: "Dependency added",
      error: "Could not add dependency.",
    });
  };

  const handleSimulateImpact = async () => {
    if (!workspaceId || !selectedDependencyProject || !simulationTaskId) {
      toast.error("Select a project task to simulate");
      return;
    }
    const request = simulateImpactMutation.mutateAsync({
      workspaceId,
      payload: {
        projectId: selectedDependencyProject,
        taskId: simulationTaskId,
        shiftDays: Number(simulationShiftDays) || 0,
      },
    });
    await toast.promise(request, {
      loading: "Running simulation...",
      success: "Simulation updated",
      error: "Could not run simulation.",
    });
  };

  const handleUpdatePlanning = async () => {
    if (!isAdminLike) {
      toast.error("Only workspace owners or admins can update planning");
      return;
    }
    if (!workspaceId) {
      return;
    }
    const request = updatePlanningMutation.mutateAsync({
      workspaceId,
      updates: {
        horizonDays: Math.max(7, Number(horizonDays) || 30),
      },
    });
    await toast.promise(request, {
      loading: "Saving planning settings...",
      success: "Planning settings updated",
      error: "Could not save planning settings.",
    });
  };

  const handleSaveCapacity = async (memberUserId: string) => {
    if (!isAdminLike) {
      toast.error("Only workspace owners or admins can update capacity");
      return;
    }
    if (!workspaceId) {
      return;
    }
    const nextValue = Number(capacityEdits[memberUserId]);
    if (!Number.isFinite(nextValue) || nextValue < 1) {
      toast.error("Capacity must be at least 1 hour/week");
      return;
    }
    const request = upsertCapacityMutation.mutateAsync({
      workspaceId,
      memberUserId,
      payload: { weeklyCapacityHours: nextValue },
    });
    await toast.promise(request, {
      loading: "Saving member capacity...",
      success: "Member capacity updated",
      error: "Could not update member capacity.",
    });
  };

  const capacityPresetOptions = React.useMemo(
    () => [
      {
        key: "0.5",
        label: `50% (${Math.max(1, Math.round(defaultWeeklyCapacityHours * 0.5))}h)`,
        hours: Math.max(1, Math.round(defaultWeeklyCapacityHours * 0.5)),
      },
      {
        key: "0.75",
        label: `75% (${Math.max(1, Math.round(defaultWeeklyCapacityHours * 0.75))}h)`,
        hours: Math.max(1, Math.round(defaultWeeklyCapacityHours * 0.75)),
      },
      {
        key: "1",
        label: `100% (${Math.max(1, Math.round(defaultWeeklyCapacityHours))}h)`,
        hours: Math.max(1, Math.round(defaultWeeklyCapacityHours)),
      },
      {
        key: "1.25",
        label: `125% (${Math.max(1, Math.round(defaultWeeklyCapacityHours * 1.25))}h)`,
        hours: Math.max(1, Math.round(defaultWeeklyCapacityHours * 1.25)),
      },
      {
        key: "1.5",
        label: `150% (${Math.max(1, Math.round(defaultWeeklyCapacityHours * 1.5))}h)`,
        hours: Math.max(1, Math.round(defaultWeeklyCapacityHours * 1.5)),
      },
    ],
    [defaultWeeklyCapacityHours],
  );

  const handleSaveApprovalPolicy = async () => {
    if (!isAdminLike) {
      return;
    }
    if (!workspaceId || !approvalPolicyDraft) {
      return;
    }
    const request = updateApprovalPolicyMutation.mutateAsync({
      workspaceId,
      updates: approvalPolicyDraft,
    });
    await toast.promise(request, {
      loading: "Updating approval policy...",
      success: "Approval policy updated",
      error: "Could not update approval policy.",
    });
  };

  if (!workspaceId) {
    return (
      <Empty className="border-border/40 bg-card min-h-[16rem]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle className="text-[14px]">Select a workspace</EmptyTitle>
          <EmptyDescription className="text-[12px]">
            Portfolio data is workspace scoped.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isAnyTopLoading) {
    return <LoaderComponent />;
  }

  return (
    <div
      data-tour="portfolio-shell"
      className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[14px] font-semibold">Portfolio</h1>
            <ProjectInfoTip content="Cross-project performance, goals, dependencies, capacity planning, and approvals in one place." />
          </div>
          <p className="text-muted-foreground text-[11px]">
            Workspace-level execution controls and signals.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              data-tour="portfolio-filters"
              variant="outline"
              className="h-8 text-[12px]"
            >
              <SlidersHorizontal className="mr-1.5 size-3.5" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[15rem] p-3">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-medium">Portfolio filters</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Project
                  </Label>
                </div>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-8 text-[12px] w-full">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.projectId}
                        value={project.projectId}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Team
                  </Label>
                </div>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="h-8 text-[12px] w-full">
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 flex-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Planning horizon (days)
                  </Label>
                  <ProjectInfoTip content="Sets the capacity window and default planning lookahead." />
                </div>

                <Input
                  value={horizonDays}
                  onChange={(event) => setHorizonDays(event.target.value)}
                  className="h-8 text-[12px]"
                />
              </div>

              <Button
                variant="outline"
                className="h-8 w-full text-[12px]"
                onClick={handleUpdatePlanning}
                disabled={!isAdminLike || updatePlanningMutation.isPending}
              >
                Save planning horizon
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(
            value as
              | "executive"
              | "okrs"
              | "health"
              | "velocity"
              | "dependencies"
              | "capacity"
              | "approvals",
          )
        }
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          data-tour="portfolio-tabs"
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 mb-3"
        >
          <TabsTrigger
            value="executive"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Executive
          </TabsTrigger>
          <TabsTrigger
            value="okrs"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            OKRs
          </TabsTrigger>
          <TabsTrigger
            value="health"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Health
          </TabsTrigger>
          <TabsTrigger
            value="velocity"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Velocity
          </TabsTrigger>
          <TabsTrigger
            value="dependencies"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Dependencies
          </TabsTrigger>
          <TabsTrigger
            value="capacity"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Capacity
          </TabsTrigger>
          <TabsTrigger
            value="approvals"
            className="h-8 flex-none rounded-lg border-0 px-3 text-[12px] font-medium text-muted-foreground data-[state=active]:bg-muted/80 data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-3">
          {!summary ? (
            <Empty className="min-h-[16rem] border-border/40 bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TrendingUp />
                </EmptyMedia>
                <EmptyTitle className="text-[14px]">
                  No executive data
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Add projects and tasks to compute health and delivery metrics.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-[13px]">
                        Execution signals
                      </CardTitle>
                      <ProjectInfoTip content="Circular meters summarize the most important portfolio signals at a glance." />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CircularMetric
                        label="Completion rate"
                        value={summary.completionRate}
                        helper={`${summary.tasks} tasks in scope`}
                        intent={
                          summary.completionRate >= 70
                            ? "good"
                            : summary.completionRate >= 45
                              ? "warn"
                              : "bad"
                        }
                      />
                      <CircularMetric
                        label="Delivery risk"
                        value={summary.deliveryRiskScore}
                        helper="Composite risk signal"
                        intent={
                          summary.deliveryRiskScore >= 70
                            ? "bad"
                            : summary.deliveryRiskScore >= 40
                              ? "warn"
                              : "good"
                        }
                      />
                      <CircularMetric
                        label="Blocked ratio"
                        value={blockedRatio}
                        helper={`${summary.blockedTasks} blocked / ${summary.openTasks} open`}
                        intent={
                          blockedRatio >= 35
                            ? "bad"
                            : blockedRatio >= 15
                              ? "warn"
                              : "good"
                        }
                      />
                      <CircularMetric
                        label="Overdue pressure"
                        value={overdueRatio}
                        helper={`${summary.overdueTasks} overdue tasks`}
                        intent={
                          overdueRatio >= 30
                            ? "bad"
                            : overdueRatio >= 12
                              ? "warn"
                              : "good"
                        }
                      />
                    </div>

                    <div className="rounded-lg border border-border/35 bg-muted/20 p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium">
                          Throughput trend
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Avg {completedVelocityAverage} tasks/week
                        </p>
                      </div>
                      <VelocityLineChart rows={velocityRows} className="border-none bg-transparent p-0" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-[13px]">
                        Action queue
                      </CardTitle>
                      <ProjectInfoTip content="Direct jumps to the places where action is needed now." />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <button
                      type="button"
                      className="bg-muted/20 hover:bg-muted/35 flex w-full items-center justify-between rounded-md border border-border/35 px-2.5 py-2 text-left transition-colors"
                      onClick={() => setActiveTab("health")}
                    >
                      <div>
                        <p className="text-[12px] font-medium">
                          At-risk projects
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {atRiskProjectCount} projects need attention
                        </p>
                      </div>
                      <AlertTriangle className="size-4 text-amber-500" />
                    </button>

                    <button
                      type="button"
                      className="bg-muted/20 hover:bg-muted/35 flex w-full items-center justify-between rounded-md border border-border/35 px-2.5 py-2 text-left transition-colors"
                      onClick={() => setActiveTab("approvals")}
                    >
                      <div>
                        <p className="text-[12px] font-medium">
                          Pending approvals
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {approvalRequests.filter((request) => request.status === "pending").length} waiting for decision
                        </p>
                      </div>
                      <ShieldCheck className="size-4 text-primary" />
                    </button>

                    <button
                      type="button"
                      className="bg-muted/20 hover:bg-muted/35 flex w-full items-center justify-between rounded-md border border-border/35 px-2.5 py-2 text-left transition-colors"
                      onClick={() => setActiveTab("capacity")}
                    >
                      <div>
                        <p className="text-[12px] font-medium">
                          Capacity pressure
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {capacityMembers.filter((member) => member.utilization > 100).length} members overloaded
                        </p>
                      </div>
                      <Users className="size-4 text-destructive" />
                    </button>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-[13px]">
                      Projects needing attention
                    </CardTitle>
                    <ProjectInfoTip content="Quick prioritization list using health, blocked and overdue signals." />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!executionActionRows.length ? (
                    <p className="text-muted-foreground text-[11px]">
                      No immediate hotspots. Portfolio signals look stable.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {executionActionRows.map((row) => (
                        <div
                          key={row.projectId}
                          className="rounded-md border border-border/35 bg-muted/20 p-2.5"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-[12px] font-medium">
                              {row.projectName}
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              Health {row.healthScore}
                            </Badge>
                          </div>
                          <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-3">
                            <span>Blocked: {row.blockedTasks}</span>
                            <span>Overdue: {row.overdueTasks}</span>
                            <span>Open: {row.openTasks}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                row.healthScore < 45
                                  ? "bg-destructive"
                                  : row.healthScore < 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500",
                              )}
                              style={{ width: `${clampPercent(row.healthScore)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="okrs" className="space-y-3 ">
          <Card className="border-border/40 gap-1">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Objectives and key results
                  </CardTitle>
                  <ProjectInfoTip content="Track strategic objectives and measure progress with key result check-ins." />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-8 text-[12px]"
                    onClick={() => setOkrCycleDialogOpen(true)}
                    disabled={!isAdminLike}
                  >
                    New cycle
                  </Button>
                  <Button
                    className="h-8 text-[12px]"
                    onClick={() => {
                      if (!okrObjectiveCycleId && okrCycles.length) {
                        setOkrObjectiveCycleId(okrCycles[0]?.id || "");
                      }
                      setOkrObjectiveDialogOpen(true);
                    }}
                    disabled={!isAdminLike || !okrCycles.length}
                  >
                    New objective
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-0">
              <p className="text-muted-foreground text-[11px]">
                Create cycles and objectives with dialogs to keep this table
                area focused on tracking progress.
              </p>
            </CardContent>
          </Card>

          {!okrCycles.length ? (
            <Empty className="min-h-[14rem] border-border/40 bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Goal />
                </EmptyMedia>
                <EmptyTitle className="text-[14px]">
                  No OKR cycles yet
                </EmptyTitle>
                <EmptyDescription className="text-[12px]">
                  Create your first cycle to start tracking objective progress.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {okrCycles.map((cycle) => (
                <Card key={cycle.id} className="border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-[13px]">
                        {cycle.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {cycle.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(cycle.objectives || []).map((objective) => (
                      <div
                        key={objective.id}
                        className="rounded-md border border-border/40 p-3"
                      >
                        <p className="text-[12px] font-medium">
                          {objective.title}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {objective.description || "No description"}
                        </p>
                        <div className="mt-2 space-y-2">
                          {(objective.keyResults || []).map((keyResult) => {
                            const checkInKey = `${cycle.id}:${objective.id}:${keyResult.id}`;
                            return (
                              <div
                                key={keyResult.id}
                                className="grid gap-2 rounded-md border border-border/30 p-2 md:grid-cols-[1fr_auto_auto]"
                              >
                                <div>
                                  <p className="text-[11px] font-medium">
                                    {keyResult.title}
                                  </p>
                                  <p className="text-muted-foreground text-[10px]">
                                    {keyResult.currentValue} /{" "}
                                    {keyResult.targetValue}
                                    {keyResult.unit ? ` ${keyResult.unit}` : ""}
                                  </p>
                                </div>
                                <Input
                                  value={checkInValues[checkInKey] || ""}
                                  onChange={(event) =>
                                    setCheckInValues((current) => ({
                                      ...current,
                                      [checkInKey]: event.target.value,
                                    }))
                                  }
                                  placeholder="Value"
                                  aria-label={`Check-in value for ${keyResult.title}`}
                                  className="h-7 w-24 text-[11px]"
                                />
                                <Button
                                  variant="outline"
                                  className="h-7 text-[11px]"
                                  onClick={() =>
                                    handleCheckIn(
                                      cycle.id,
                                      objective.id,
                                      keyResult.id,
                                    )
                                  }
                                  disabled={checkInMutation.isPending}
                                >
                                  Check-in
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="health">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">Project health</CardTitle>
                  <ProjectInfoTip content="Health score per project based on open, blocked, overdue and completion metrics." />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {atRiskProjectCount} at-risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!healthRows.length ? (
                <Empty className="border-none p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Activity />
                    </EmptyMedia>
                    <EmptyTitle className="text-[13px]">
                      No health rows
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Open</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {healthRows.map((row) => (
                      <TableRow key={row.projectId}>
                        <TableCell className="text-[12px]">
                          {row.projectName}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {row.healthScore}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          <div className="w-28 space-y-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  row.healthScore < 45
                                    ? "bg-destructive"
                                    : row.healthScore < 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                                style={{
                                  width: `${clampPercent(row.healthScore)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {row.openTasks}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {row.blockedTasks}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {row.overdueTasks}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {row.completionRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity">
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[13px]">Velocity trend</CardTitle>
                <ProjectInfoTip content="Weekly completed-task trend to understand delivery throughput over time." />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!velocityRows.length ? (
                <Empty className="border-none p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TrendingUp />
                    </EmptyMedia>
                    <EmptyTitle className="text-[13px]">
                      No velocity data
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-3">
                  <VelocityLineChart rows={velocityRows} />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {velocityRows.map((row) => (
                      <div
                        key={`${row.weekStart}-${row.weekEnd}`}
                        className="rounded-md border border-border/35 bg-muted/20 p-2"
                      >
                        <p className="text-[11px] font-medium">{row.weekLabel}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {row.completedTasks} completed tasks
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="dependencies"
          data-tour="portfolio-dependencies"
          className="space-y-3"
        >
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Dependency controls
                  </CardTitle>
                  <ProjectInfoTip content="Set task-to-task dependencies and monitor downstream impact in this project." />
                </div>

                <Select
                  value={selectedDependencyProject || ""}
                  onValueChange={setSelectedDependencyProject}
                >
                  <SelectTrigger
                    aria-label="Dependency project"
                    className="h-8 text-[12px] ml-auto"
                  >
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem
                        key={project.projectId}
                        value={project.projectId}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="h-8 text-[12px]"
                  onClick={() => setDependencyDialogOpen(true)}
                  disabled={!selectedDependencyProject}
                >
                  Add dependency
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[13px]">Dependencies</CardTitle>
                <ProjectInfoTip content="Current dependency edges linking source tasks to target tasks." />
              </div>
            </CardHeader>
            <CardContent>
              {!dependencies.length ? (
                <Empty className="border-none p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GitBranch />
                    </EmptyMedia>
                    <EmptyTitle className="text-[13px]">
                      No dependencies yet
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Lag</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dependencies.map((dependency) => (
                      <TableRow key={dependency.id}>
                        <TableCell className="text-[12px]">
                          <div className="space-y-0.5">
                            <p className="text-[12px]">
                              {dependencyTaskMetaById.get(
                                dependency.sourceTaskId,
                              )?.title || dependency.sourceTaskId}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {dependencyTaskMetaById.get(
                                dependency.sourceTaskId,
                              )?.workflowName || "Unknown workflow"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px]">
                          <div className="space-y-0.5">
                            <p className="text-[12px]">
                              {dependencyTaskMetaById.get(
                                dependency.targetTaskId,
                              )?.title || dependency.targetTaskId}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {dependencyTaskMetaById.get(
                                dependency.targetTaskId,
                              )?.workflowName || "Unknown workflow"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {dependency.lagDays}d
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="h-7 text-[11px]"
                            onClick={async () => {
                              const request =
                                deleteDependencyMutation.mutateAsync({
                                  workspaceId,
                                  dependencyId: dependency.id,
                                });
                              await toast.promise(request, {
                                loading: "Removing dependency...",
                                success: "Dependency removed",
                                error: "Could not remove dependency.",
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">Critical path</CardTitle>
                  <ProjectInfoTip content="Most delay-sensitive chain of tasks from the dependency graph." />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalPath.length ? (
                  criticalPath.map((node) => (
                    <div
                      key={node.id}
                      className="rounded-md border border-border/35 p-2"
                    >
                      <p className="text-[12px] font-medium">{node.title}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {node.workflowName}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    Select a project and set dependencies to compute the path.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Impact simulation
                  </CardTitle>
                  <ProjectInfoTip content="Simulates how moving one task date affects downstream deadlines." />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 ">
                  <div className="space-y-1 md:flex-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Task
                      </Label>
                      <ProjectInfoTip content="Task to shift in the what-if simulation." />
                    </div>
                    <Select
                      value={simulationTaskId || ""}
                      onValueChange={setSimulationTaskId}
                    >
                      <SelectTrigger
                        aria-label="Simulation task"
                        className="text-[12px] w-full"
                      >
                        <SelectValue placeholder="Task" />
                      </SelectTrigger>
                      <SelectContent>
                        {dependencyNodes.map((node) => (
                          <SelectItem key={node.id} value={node.taskId}>
                            {node.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:flex-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Shift days
                      </Label>
                      <ProjectInfoTip content="Positive values move dates out; negative values pull them earlier." />
                    </div>
                    <Input
                      value={simulationShiftDays}
                      onChange={(event) =>
                        setSimulationShiftDays(event.target.value)
                      }
                      className="text-[12px]"
                      placeholder="Shift days"
                    />
                  </div>
                  <Button
                    className="max-w-20 mt-2"
                    onClick={handleSimulateImpact}
                    disabled={simulateImpactMutation.isPending}
                  >
                    Simulate
                  </Button>
                </div>
                {simulateImpactMutation.data?.data?.impacted?.length ? (
                  <div className="space-y-2">
                    {simulateImpactMutation.data.data.impacted.map(
                      (row: PortfolioSimulationImpactRow) => (
                        <div
                          key={row.taskId}
                          className="rounded-md border border-border/30 p-2"
                        >
                          <p className="text-[12px] font-medium">{row.title}</p>
                          <p className="text-muted-foreground text-[11px]">
                            {row.oldDueDate} → {row.newDueDate} (
                            {row.deltaDays > 0 ? "+" : ""}
                            {row.deltaDays}d)
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="capacity"
          data-tour="portfolio-capacity"
          className="space-y-3"
        >
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-[13px]">
                  Member utilization
                </CardTitle>
                <ProjectInfoTip content="Compares estimated work demand versus weekly capacity per member." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 gap-2 flex items-start">
                <div className="space-y-1  flex-3">
                  <Label className="text-[11px] text-muted-foreground">
                    Search member
                  </Label>
                  <Input
                    value={capacitySearch}
                    onChange={(event) => setCapacitySearch(event.target.value)}
                    className="h-8 text-[12px]"
                    placeholder="Search name or email"
                  />
                </div>
                <div className="space-y-1 flex-1 ">
                  <Label className="text-[11px] text-muted-foreground">
                    Filter team
                  </Label>
                  <Select
                    value={capacityTeamFilter}
                    onValueChange={setCapacityTeamFilter}
                  >
                    <SelectTrigger className="h-8 text-[12px] w-full">
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 ">
                  <Label className="text-[11px] text-muted-foreground">
                    Rows
                  </Label>
                  <Select
                    value={capacityPageSize}
                    onValueChange={setCapacityPageSize}
                  >
                    <SelectTrigger className="h-8 text-[12px] w-full">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {capacityQuery?.isPending ? (
                <LoaderComponent />
              ) : !capacityMembers.length ? (
                <Empty className="border-none p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle className="text-[13px]">
                      No members found
                    </EmptyTitle>
                    <EmptyDescription className="text-[12px]">
                      Try adjusting the member search, team filter, or horizon.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-2">
                  {capacityPlanning?.capacityDerivedFromWorkSchedule ? (
                    <p className="text-muted-foreground text-[11px]">
                      Capacity baseline uses workspace hours{" "}
                      <span className="font-medium text-foreground">
                        {capacityPlanning.workScheduleStartTime || "09:00"} -{" "}
                        {capacityPlanning.workScheduleCloseTime || "18:00"}
                      </span>{" "}
                      ({capacityPlanning.workDaysPerWeek || 5} days/week) ={" "}
                      <span className="font-medium text-foreground">
                        {defaultWeeklyCapacityHours}h/week
                      </span>
                      .
                    </p>
                  ) : null}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Demand</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Utilization</TableHead>
                        <TableHead>
                          <div className="inline-flex items-center gap-1">
                            <span>Override</span>
                            <ProjectInfoTip
                              content="Set weekly capacity in hours. Presets are calculated from workspace working hours. 100% equals the schedule-derived weekly capacity."
                              align="end"
                            />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capacityMembers.map((member) => (
                        <TableRow key={member.userId}>
                          <TableCell className="text-[12px]">
                            {member.name}
                          </TableCell>
                          <TableCell className="text-[12px]">
                            {member.demandHours}h
                          </TableCell>
                          <TableCell className="text-[12px]">
                            {member.capacityHours}h
                          </TableCell>
                          <TableCell className="text-[12px]">
                            <div className="space-y-1">
                              <div className="bg-muted h-1.5 w-32 overflow-hidden rounded-full">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    member.utilization > 100
                                      ? "bg-destructive"
                                      : member.utilization >= 80
                                        ? "bg-amber-500"
                                        : "bg-emerald-500",
                                  )}
                                  style={{
                                    width: `${Math.min(100, member.utilization)}%`,
                                  }}
                                />
                              </div>
                              <p className="text-muted-foreground text-[10px]">
                                {member.utilization}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const draftValue =
                                  capacityEdits[member.userId] ??
                                  String(member.capacityHours || "");
                                const parsedDraft = Number(draftValue);
                                const normalizedDraft = Number.isFinite(
                                  parsedDraft,
                                )
                                  ? parsedDraft
                                  : null;
                                const capacityRatio =
                                  normalizedDraft &&
                                  defaultWeeklyCapacityHours > 0
                                    ? Math.round(
                                        (normalizedDraft /
                                          defaultWeeklyCapacityHours) *
                                          100,
                                      )
                                    : null;

                                return (
                                  <>
                                    <Input
                                      value={draftValue}
                                      onChange={(event) =>
                                        setCapacityEdits((current) => ({
                                          ...current,
                                          [member.userId]: event.target.value,
                                        }))
                                      }
                                      aria-label={`Capacity override for ${member.name}`}
                                      className="h-7 w-20 text-[11px]"
                                      placeholder={`${defaultWeeklyCapacityHours}`}
                                    />
                                    <span className="text-muted-foreground text-[10px]">
                                      h/wk
                                    </span>
                                    <Select
                                      onValueChange={(value) => {
                                        const preset =
                                          capacityPresetOptions.find(
                                            (option) => option.key === value,
                                          );

                                        if (!preset) {
                                          return;
                                        }

                                        setCapacityEdits((current) => ({
                                          ...current,
                                          [member.userId]: String(preset.hours),
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="h-7 w-[110px] text-[11px]">
                                        <SelectValue placeholder="Preset" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {capacityPresetOptions.map((option) => (
                                          <SelectItem
                                            key={option.key}
                                            value={option.key}
                                          >
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="outline"
                                      className="h-7 text-[11px]"
                                      onClick={() =>
                                        handleSaveCapacity(member.userId)
                                      }
                                      disabled={!isAdminLike}
                                    >
                                      Save
                                    </Button>
                                    <span className="text-muted-foreground text-[10px]">
                                      {capacityRatio
                                        ? `${capacityRatio}%`
                                        : "—"}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between gap-2 border-t border-border/35 pt-2">
                    <p className="text-muted-foreground text-[11px]">
                      Showing page {capacityPagination?.page || 1} of{" "}
                      {capacityPagination?.totalPages || 1}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setCapacityPage((page) => Math.max(1, page - 1))
                        }
                        disabled={!capacityPagination?.hasPrevPage}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setCapacityPage((page) => page + 1)}
                        disabled={!capacityPagination?.hasNextPage}
                        aria-label="Next page"
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Team utilization
                  </CardTitle>
                  <ProjectInfoTip content="Aggregated utilization for each team in scope." />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {capacityTeams.length ? (
                  capacityTeams.map((team) => (
                    <div
                      key={team.teamId}
                      className="rounded-md border border-border/35 p-2"
                    >
                      <p className="text-[12px] font-medium">
                        {teamNameById.get(String(team.teamId || "").trim()) ||
                          team.teamName ||
                          String(team.teamId || "Unassigned team")}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {team.utilization}% ({team.demandHours}h /{" "}
                        {team.capacityHours}h)
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    No team rows yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Rebalance suggestions
                  </CardTitle>
                  <ProjectInfoTip content="Recommended workload moves from overloaded members to available teammates." />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {capacityRecommendations.length ? (
                  capacityRecommendations.map((recommendation, index) => (
                    <div
                      key={`${recommendation.sourceUserId}-${recommendation.targetUserId}-${index}`}
                      className="rounded-md border border-border/35 p-2"
                    >
                      <p className="text-[12px] font-medium">
                        {recommendation.sourceName} →{" "}
                        {recommendation.targetName}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {recommendation.reason}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-[11px]">
                    No suggestions right now.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="approvals"
          data-tour="portfolio-approvals"
          className="space-y-3"
        >
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">Approval policy</CardTitle>
                  <ProjectInfoTip content="Defines which sensitive actions require explicit approval before execution." />
                </div>
                {isAdminLike ? (
                  <Button
                    variant="outline"
                    className="h-8 text-[12px]"
                    onClick={() => setApprovalPolicyDialogOpen(true)}
                  >
                    Manage policy
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isAdminLike ? (
                <p className="text-muted-foreground text-[12px]">
                  Approval policy can be managed by workspace owners and admins.
                </p>
              ) : !approvalPolicy ? (
                <LoaderComponent />
              ) : (
                <div className="grid gap-2">
                  {approvalPolicyItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-md border border-border/30 p-2"
                    >
                      <p className="text-[12px]">{item.label}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {approvalPolicy[item.key] ? "Required" : "Not required"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px]">
                    Approval requests
                  </CardTitle>
                  <ProjectInfoTip content="Pending and historical approval requests for protected actions." />
                </div>
                <Select
                  value={approvalStatusFilter}
                  onValueChange={setApprovalStatusFilter}
                >
                  <SelectTrigger
                    aria-label="Approval request status filter"
                    className="h-7 w-[10rem] text-[11px]"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!approvalRequests.length ? (
                <Empty className="border-none p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ShieldCheck />
                    </EmptyMedia>
                    <EmptyTitle className="text-[13px]">No requests</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-[12px]">
                          {request.actionType}
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {request.summary}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.status === "pending" && isAdminLike ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={async () => {
                                  const mutationRequest =
                                    approveRequestMutation.mutateAsync({
                                      workspaceId,
                                      requestId: request.id,
                                    });
                                  await toast.promise(mutationRequest, {
                                    loading: "Approving request...",
                                    success: "Request approved",
                                    error: "Could not approve request.",
                                  });
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-7 text-[11px]"
                                onClick={async () => {
                                  const mutationRequest =
                                    rejectRequestMutation.mutateAsync({
                                      workspaceId,
                                      requestId: request.id,
                                    });
                                  await toast.promise(mutationRequest, {
                                    loading: "Rejecting request...",
                                    success: "Request rejected",
                                    error: "Could not reject request.",
                                  });
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : request.status === "pending" ? (
                            <span className="text-muted-foreground text-[11px]">
                              Awaiting approver
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">
                              Closed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={okrCycleDialogOpen} onOpenChange={setOkrCycleDialogOpen}>
        <DialogContent className="sm:max-w-[30rem]">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Create OKR cycle</DialogTitle>
            <DialogDescription className="text-[12px]">
              Define the OKR period for objectives and check-ins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Cycle name
                </Label>
                <ProjectInfoTip content="Quarterly or monthly label for this OKR period." />
              </div>
              <Input
                value={okrCycleName}
                onChange={(event) => setOkrCycleName(event.target.value)}
                placeholder="Cycle name"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Start date
                </Label>
                <ProjectInfoTip content="Date this cycle starts tracking progress." />
              </div>
              <Input
                type="date"
                value={okrCycleStart}
                onChange={(event) => setOkrCycleStart(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  End date
                </Label>
                <ProjectInfoTip content="Date this cycle closes for check-ins." />
              </div>
              <Input
                type="date"
                value={okrCycleEnd}
                onChange={(event) => setOkrCycleEnd(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="h-8 text-[12px]"
              onClick={() => setOkrCycleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8 text-[12px]"
              onClick={handleCreateCycle}
              disabled={!isAdminLike || createOkrCycleMutation.isPending}
            >
              Create cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={okrObjectiveDialogOpen}
        onOpenChange={setOkrObjectiveDialogOpen}
      >
        <DialogContent className="sm:max-w-[30rem]">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Create objective</DialogTitle>
            <DialogDescription className="text-[12px]">
              Add a measurable objective under an existing OKR cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Cycle
                </Label>
                <ProjectInfoTip content="Objective will be created inside this OKR cycle." />
              </div>
              <Select
                value={okrObjectiveCycleId}
                onValueChange={setOkrObjectiveCycleId}
              >
                <SelectTrigger className="text-[12px] w-full">
                  <SelectValue placeholder="Pick cycle" />
                </SelectTrigger>
                <SelectContent>
                  {okrCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Objective title
                </Label>
                <ProjectInfoTip content="A clear outcome statement for the selected cycle." />
              </div>
              <Input
                value={okrObjectiveTitle}
                onChange={(event) => setOkrObjectiveTitle(event.target.value)}
                placeholder="Objective title"
                className="h-8 text-[12px]"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Description
                </Label>
                <ProjectInfoTip content="Context for collaborators on what success means." />
              </div>
              <Input
                value={okrObjectiveDescription}
                onChange={(event) =>
                  setOkrObjectiveDescription(event.target.value)
                }
                placeholder="Description"
                className="h-8 text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="h-8 text-[12px]"
              onClick={() => setOkrObjectiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8 text-[12px]"
              onClick={handleCreateObjective}
              disabled={!isAdminLike || createOkrObjectiveMutation.isPending}
            >
              Create objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dependencyDialogOpen}
        onOpenChange={setDependencyDialogOpen}
      >
        <DialogContent className="sm:max-w-[30rem]">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Add dependency</DialogTitle>
            <DialogDescription className="text-[12px]">
              Define the upstream task that must complete before the target task
              can finish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Source task
                </Label>
                <ProjectInfoTip content="Task that must finish first." />
              </div>
              <Select
                value={sourceTaskId || ""}
                onValueChange={setSourceTaskId}
              >
                <SelectTrigger className="h-8 text-[12px] w-full">
                  <SelectValue placeholder="Source task" />
                </SelectTrigger>
                <SelectContent>
                  {dependencyTasks.map((task) => (
                    <SelectItem key={`source-${task.id}`} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Target task
                </Label>
                <ProjectInfoTip content="Task that waits on the source task." />
              </div>
              <Select
                value={targetTaskId || ""}
                onValueChange={setTargetTaskId}
              >
                <SelectTrigger className="h-8 text-[12px] w-full">
                  <SelectValue placeholder="Target task" />
                </SelectTrigger>
                <SelectContent>
                  {dependencyTasks.map((task) => (
                    <SelectItem key={`target-${task.id}`} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground">
                  Lag days
                </Label>
                <ProjectInfoTip content="Optional delay between source completion and target start." />
              </div>
              <Input
                value={lagDays}
                onChange={(event) => setLagDays(event.target.value)}
                className="h-8 text-[12px]"
                placeholder="Lag days"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="h-8 text-[12px]"
              onClick={() => setDependencyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8 text-[12px]"
              onClick={handleCreateDependency}
              disabled={createDependencyMutation.isPending}
            >
              Add dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approvalPolicyDialogOpen}
        onOpenChange={setApprovalPolicyDialogOpen}
      >
        <DialogContent className="sm:max-w-[30rem]">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Approval policy</DialogTitle>
            <DialogDescription className="text-[12px]">
              Toggle hard-gate approvals for sensitive actions.
            </DialogDescription>
          </DialogHeader>
          {!approvalPolicyDraft ? (
            <LoaderComponent />
          ) : (
            <>
              <div className="space-y-2">
                {approvalPolicyItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border border-border/30 p-2"
                  >
                    <p className="text-[12px]">{item.label}</p>
                    <Switch
                      checked={approvalPolicyDraft[item.key]}
                      onCheckedChange={(checked) =>
                        setApprovalPolicyDraft((current) =>
                          current
                            ? {
                                ...current,
                                [item.key]: checked,
                              }
                            : current,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  className="h-8 text-[12px]"
                  onClick={() => setApprovalPolicyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-8 text-[12px]"
                  onClick={handleSaveApprovalPolicy}
                  disabled={updateApprovalPolicyMutation.isPending}
                >
                  Save policy
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspacePortfolio;

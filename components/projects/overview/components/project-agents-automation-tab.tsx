"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  MarkerType,
  ReactFlow,
  ReactFlowInstance,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  Bot,
  Brain,
  GitBranchPlus,
  Maximize2,
  Minimize2,
  PencilLine,
  Play,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { ProjectOverviewRecord } from "../types";

type AgentNodeKind = "trigger" | "decision" | "action";

type AgentNodeData = {
  label: string;
  note: string;
  kind: AgentNodeKind;
};

type ProjectAgentsAutomationTabProps = {
  project: ProjectOverviewRecord;
};

const KIND_BADGE: Record<AgentNodeKind, string> = {
  trigger: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  decision: "border-primary/20 bg-primary/10 text-primary",
  action: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

function createNodeId() {
  return `agent-node-${Math.random().toString(36).slice(2, 8)}`;
}

function AgentFlowNode({ data, selected }: NodeProps<Node<AgentNodeData>>) {
  return (
    <div
      className={cn(
        "relative overflow-visible min-w-[11.75rem] rounded-2xl border bg-card px-3 py-2 shadow-sm transition-shadow",
        selected ? "border-primary/40 shadow-md" : "border-border/40",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!z-20 !size-4 !border-2 !border-background !bg-sky-500 !opacity-100 !shadow-[0_0_0_1px_hsl(var(--border)),0_0_0_6px_hsl(var(--background))]"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[12px] font-medium">{data.label}</div>
        <Badge variant="outline" className={cn("text-[10px] capitalize", KIND_BADGE[data.kind])}>
          {data.kind}
        </Badge>
      </div>
      <div className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-4">
        {data.note}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!z-20 !size-4 !border-2 !border-background !bg-primary !opacity-100 !shadow-[0_0_0_1px_hsl(var(--border)),0_0_0_6px_hsl(var(--background))]"
      />
    </div>
  );
}

function buildInitialNodes(project: ProjectOverviewRecord): Node<AgentNodeData>[] {
  return [
    {
      id: "trigger-1",
      type: "agentNode",
      position: { x: 40, y: 120 },
      data: {
        label: "Task event received",
        note: `A workflow or task change enters ${project.name}.`,
        kind: "trigger",
      },
    },
    {
      id: "decision-1",
      type: "agentNode",
      position: { x: 340, y: 96 },
      data: {
        label: "Scope changed?",
        note: "Check whether the change affects delivery scope, capacity, or plan assumptions.",
        kind: "decision",
      },
    },
    {
      id: "decision-2",
      type: "agentNode",
      position: { x: 340, y: 244 },
      data: {
        label: "Risk above medium?",
        note: "Escalate when the task or workflow pushes the project into meaningful risk.",
        kind: "decision",
      },
    },
    {
      id: "action-1",
      type: "agentNode",
      position: { x: 700, y: 84 },
      data: {
        label: "Replan workflow",
        note: "Adjust owners, dates, and workflow sequencing before the project drifts.",
        kind: "action",
      },
    },
    {
      id: "action-2",
      type: "agentNode",
      position: { x: 700, y: 226 },
      data: {
        label: "Escalate to project lead",
        note: "Notify the human lead and surface the exact decision trail.",
        kind: "action",
      },
    },
    {
      id: "action-3",
      type: "agentNode",
      position: { x: 700, y: 364 },
      data: {
        label: "Continue execution",
        note: "Keep the task in normal flow and record the decision for later learning.",
        kind: "action",
      },
    },
  ];
}

const INITIAL_EDGES: Edge[] = [
  { id: "e-trigger-decision-1", source: "trigger-1", target: "decision-1", label: "intake" },
  { id: "e-trigger-decision-2", source: "trigger-1", target: "decision-2", label: "monitor" },
  { id: "e-decision-1-action-1", source: "decision-1", target: "action-1", label: "yes" },
  { id: "e-decision-2-action-2", source: "decision-2", target: "action-2", label: "yes" },
  { id: "e-decision-2-action-3", source: "decision-2", target: "action-3", label: "no" },
];

const NODE_TYPES = {
  agentNode: AgentFlowNode,
};

export function ProjectAgentsAutomationTab({ project }: ProjectAgentsAutomationTabProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes(project));
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("decision-1");
  const [agentMode, setAgentMode] = useState<"observe" | "assist" | "autopilot">("assist");
  const [agentName, setAgentName] = useState(`${project.name} delivery agent`);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<AgentNodeData>, Edge> | null
  >(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const learnedSignals = useMemo(() => {
    const delayed = project.workflows.filter((workflow) => workflow.status !== "complete").length;
    const risks = project.risks.filter((risk) => risk.kind === "risk").length;
    const handoffs = project.activities.length;

    return [
      `${delayed} active workflows still need attention`,
      `${risks} project risks are currently tracked`,
      `${handoffs} recent project signals are available for learning`,
    ];
  }, [project.activities.length, project.risks, project.workflows]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge({ ...connection, id: `edge-${Date.now()}` }, current));
    },
    [setEdges],
  );

  const updateSelectedNode = useCallback(
    (nextData: Partial<AgentNodeData>) => {
      if (!selectedNodeId) {
        return;
      }

      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...nextData,
                },
              }
            : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  const handleAddNode = useCallback(
    (kind: AgentNodeKind, position?: { x: number; y: number }) => {
      const id = createNodeId();
      const selected = nodes.find((node) => node.id === selectedNodeId);
      const fallbackX = 60 + nodes.length * 34;
      const fallbackY = 90 + (nodes.length % 5) * 76;

      const nextNode: Node<AgentNodeData> = {
        id,
        type: "agentNode",
        position:
          position ??
          (selected
            ? { x: selected.position.x + 260, y: selected.position.y + 24 }
            : { x: fallbackX, y: fallbackY }),
        data: {
          label:
            kind === "trigger"
              ? "New trigger"
              : kind === "decision"
                ? "New decision"
                : "Freeform note",
          note:
            kind === "trigger"
              ? "Start a new automation entry point."
              : kind === "decision"
                ? "Define the branch rule this agent should evaluate."
                : "Drop a note anywhere on the board and refine its logic.",
          kind,
        },
      };

      setNodes((current) => [...current, nextNode]);

      if (selected && !position) {
        setEdges((current) => [
          ...current,
          {
            id: `edge-${selected.id}-${id}`,
            source: selected.id,
            target: id,
            label: kind === "decision" ? "branch" : "next",
          },
        ]);
      }

      setSelectedNodeId(id);
    },
    [nodes, selectedNodeId, setEdges, setNodes],
  );

  const handlePaneDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;

      if (!flowInstance || !target.closest(".react-flow__pane")) {
        return;
      }

      const position = flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      handleAddNode("action", position);
    },
    [flowInstance, handleAddNode],
  );

  const handleDuplicateNode = () => {
    if (!selectedNode) {
      return;
    }

    const id = createNodeId();
    const nextNode: Node<AgentNodeData> = {
      ...selectedNode,
      id,
      position: {
        x: selectedNode.position.x + 32,
        y: selectedNode.position.y + 32,
      },
      data: {
        ...selectedNode.data,
        label: `${selectedNode.data.label} copy`,
      },
    };

    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(id);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) {
      return;
    }

    const nextSelectedId = nodes.find((node) => node.id !== selectedNodeId)?.id ?? "";

    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
    );
    setSelectedNodeId(nextSelectedId);
  };

  const handleSimulate = () => {
    const currentNode = selectedNode?.data.label ?? "current agent graph";
    toast(`Simulation run queued for ${currentNode}.`);
  };

  const handlePublish = () => {
    toast("Agent control logic published locally.");
  };

  const renderSidebar = (idPrefix: string, compact = false) => (
    <div className={cn("space-y-3", compact && "h-full overflow-y-auto p-4")}>
      <section className="rounded-xl border border-border/35 bg-card/75 p-3 shadow-xs">
        <div className="text-[13px] font-semibold">Agent memory</div>
        <div className="mt-2 space-y-2">
          {learnedSignals.map((signal) => (
            <div key={signal} className="rounded-lg border border-border/20 bg-background/70 px-3 py-2 text-[12px]">
              {signal}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/35 bg-card/75 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-semibold">Node inspector</div>
          {selectedNode ? (
            <Badge variant="outline" className={cn("text-[10px] capitalize", KIND_BADGE[selectedNode.data.kind])}>
              {selectedNode.data.kind}
            </Badge>
          ) : null}
        </div>

        {selectedNode ? (
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-agent-name`}>Assigned agent</Label>
              <Input
                id={`${idPrefix}-agent-name`}
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-node-label`}>Node label</Label>
              <Input
                id={`${idPrefix}-node-label`}
                value={selectedNode.data.label}
                onChange={(event) => updateSelectedNode({ label: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Node kind</Label>
              <Select
                value={selectedNode.data.kind}
                onValueChange={(value) => updateSelectedNode({ kind: value as AgentNodeKind })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trigger">Trigger</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-node-note`}>Decision note</Label>
              <Textarea
                id={`${idPrefix}-node-note`}
                value={selectedNode.data.note}
                onChange={(event) => updateSelectedNode({ note: event.target.value })}
                className="min-h-24"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDuplicateNode}>
                <GitBranchPlus />
                Duplicate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleSimulate}>
                <Play />
                Simulate
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDeleteNode}>
                <Trash2 />
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground mt-3 text-[12px] leading-5">
            Select a node to edit it, or double-click the canvas to drop a new freeform note.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/35 bg-card/75 p-3 shadow-xs">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <PencilLine className="size-3.5" />
          Freeform tips
        </div>
        <div className="text-muted-foreground mt-2 space-y-2 text-[12px] leading-5">
          <div>Use the canvas like a sketch surface: drop notes first, then wire the logic after.</div>
          <div>Connectors are now visible on both sides of each node. Drag from one handle into another to branch the flow.</div>
        </div>
      </section>
    </div>
  );

  const renderCanvas = (expanded = false) => (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/35 bg-card shadow-xs",
        expanded && "flex h-full min-h-0 flex-col rounded-none border-0 bg-background shadow-none",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/15 px-3 py-3 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold">Decision graph</div>
            <div className="text-muted-foreground text-[12px] leading-5">
              Drag to move. Drag between handles to connect. Double-click empty space to drop a new note.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleAddNode("trigger")}>
              <Sparkles />
              Trigger
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleAddNode("decision")}>
              <GitBranchPlus />
              Decision
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleAddNode("action")}>
              <Brain />
              Action
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded((current) => !current)}>
              {expanded ? <Minimize2 /> : <Maximize2 />}
              {expanded ? "Exit full screen" : "Expand"}
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn("relative bg-background", expanded ? "min-h-0 flex-1" : "h-[42rem]")}
        onDoubleClick={handlePaneDoubleClick}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onInit={setFlowInstance}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId("")}
          fitView
          fitViewOptions={{ padding: expanded ? 0.08 : 0.12 }}
          minZoom={0.45}
          maxZoom={1.5}
          zoomOnDoubleClick={false}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(var(--primary))",
              width: 18,
              height: 18,
            },
            style: {
              stroke: "hsl(var(--primary))",
              strokeWidth: 2.4,
            },
            labelStyle: {
              fill: "hsl(var(--foreground))",
              fontSize: 11,
              fontWeight: 600,
            },
          }}
          connectionLineStyle={{
            stroke: "hsl(var(--primary))",
            strokeWidth: 2.6,
          }}
          proOptions={{ hideAttribution: true }}
          className="!bg-background"
        >
          <Background gap={22} size={1} color="hsl(var(--border) / 0.42)" />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="!shadow-sm [&>button]:!size-8 [&>button]:!border-border/30 [&>button]:!bg-background"
          />
        </ReactFlow>

        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <div className="pointer-events-none rounded-lg border border-border/20 bg-background/92 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
            Double-click to add note
          </div>
          <div className="pointer-events-none rounded-lg border border-border/20 bg-background/92 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
            Connect visible node handles to branch logic
          </div>
        </div>

        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/25 bg-background/92 p-2 shadow-sm">
          <Button type="button" variant="outline" size="sm" onClick={() => handleAddNode("trigger")}>
            <Sparkles />
            Trigger
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleAddNode("decision")}>
            <GitBranchPlus />
            Decision
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleAddNode("action")}>
            <Brain />
            Note
          </Button>
        </div>
      </div>
    </section>
  );

  return (
    <ReactFlowProvider>
      <div className="flex flex-col gap-3 md:gap-4">
        <section className="rounded-xl border border-border/35 bg-card/75 p-3 shadow-xs md:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
                <div>
                  <div className="text-[14px] font-semibold md:text-[15px]">Agents & automation</div>
                  <div className="text-muted-foreground text-[12px] leading-5">
                    Shape the project agent like a freeform board: drag nodes, connect branches, and add new notes directly on the canvas.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Badge variant="outline">Assigned: {agentName}</Badge>
                <Badge variant="outline">Mode: {agentMode}</Badge>
                <Badge variant="outline">{nodes.length} nodes</Badge>
                <Badge variant="outline">{edges.length} paths</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={agentMode} onValueChange={(value) => setAgentMode(value as typeof agentMode)}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="observe">Observe only</SelectItem>
                  <SelectItem value="assist">Assist</SelectItem>
                  <SelectItem value="autopilot">Autopilot</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={handleSimulate}>
                <Play />
                Run simulation
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handlePublish}>
                <Save />
                Publish logic
              </Button>
            </div>
          </div>
        </section>

        {!isExpanded ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
            {renderCanvas(false)}
            {renderSidebar("inline")}
          </div>
        ) : null}

        {isExpanded ? (
          <div className="fixed inset-0 z-[80] flex h-dvh w-screen flex-col bg-background">
            <div className="flex shrink-0 items-center justify-between border-b border-border/15 px-4 py-3">
              <div>
                <div className="text-[14px] font-semibold">Expanded agent editor</div>
                <div className="text-muted-foreground text-[12px] leading-5">
                  Full-screen editor. The canvas fills the viewport and the inspector stays docked on the right.
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                <X />
                Close
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 bg-background xl:grid-cols-[minmax(0,1fr)_22rem] xl:overflow-hidden">
              <div className="min-h-0 border-r border-border/15 bg-background">{renderCanvas(true)}</div>
              <div className="min-h-0 border-l border-border/15 bg-card">{renderSidebar("expanded", true)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </ReactFlowProvider>
  );
}

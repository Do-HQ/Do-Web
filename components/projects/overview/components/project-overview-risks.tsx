import { MoreHorizontal, ShieldAlert, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

import { ProjectRisk, ProjectRiskKind } from "../types";
import {
  RISK_BADGE_CLASSES,
  formatPipelineLabel,
  getViewChipClass,
} from "../utils";

type ProjectOverviewRisksProps = {
  view: ProjectRiskKind;
  onViewChange: (value: ProjectRiskKind) => void;
  items: ProjectRisk[];
  currentUserId?: string;
  onAction?: (
    action: "open-details" | "resolve" | "close" | "delete",
    risk: ProjectRisk,
  ) => void;
};

export function ProjectOverviewRisks({
  view,
  onViewChange,
  items,
  currentUserId,
  onAction,
}: ProjectOverviewRisksProps) {
  const visibleItems = items.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-xl border border-border/35 bg-card/70 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border/35 px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold md:text-[15px]">Risks & Issues</h2>
          <p className="text-muted-foreground line-clamp-1 text-[11px] leading-5">
            The sharpest blockers in the current scope.
          </p>
        </div>

        <div className="bg-muted/80 inline-flex rounded-md p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewChange("risk")}
            className={getViewChipClass(view === "risk")}
          >
            Risks
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewChange("issue")}
            className={getViewChipClass(view === "issue")}
          >
            Issues
          </Button>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="divide-y divide-border/35">
          {visibleItems.map((item) => {
            const Icon = item.kind === "risk" ? TriangleAlert : ShieldAlert;
            const creatorId = String(
              item.createdByUserId || item.ownerUserId || "",
            ).trim();
            const canEdit =
              Boolean(currentUserId) &&
              Boolean(creatorId) &&
              creatorId === String(currentUserId).trim();
            const isClosed = item.state === "closed";

            return (
              <div key={item.id} className="px-3 py-2 md:px-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-background/80">
                    <Icon className="size-3 text-primary" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        className={`h-4 px-1.5 text-[10px] ${RISK_BADGE_CLASSES[item.severity]}`}
                        variant="outline"
                      >
                        {item.severity}
                      </Badge>
                      <div className="line-clamp-1 text-[12px] font-medium md:text-[13px]">
                        {item.title}
                      </div>
                      <span className="text-muted-foreground text-[10px] capitalize">
                        {item.state || "open"}
                      </span>
                    </div>

                    <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 text-[11px]">
                      <span className="truncate">{item.owner}</span>
                      <span className="opacity-60">•</span>
                      <span className="truncate">{item.status}</span>
                      {item.pipelineId ? (
                        <>
                          <span className="opacity-60">•</span>
                          <span className="truncate">{formatPipelineLabel(item.pipelineId)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onAction?.("open-details", item)}
                      >
                        Open details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canEdit || isClosed}
                        onClick={() => onAction?.("resolve", item)}
                      >
                        Mark resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canEdit || isClosed || item.state !== "resolved"}
                        onClick={() => onAction?.("close", item)}
                      >
                        Close
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canEdit || isClosed}
                        onClick={() => onAction?.("delete", item)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-3 md:px-4">
          <Empty className="border-0 p-0 md:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert className="size-4 text-primary/85" />
              </EmptyMedia>
              <EmptyDescription className="text-[12px]">
                No {view === "risk" ? "risks" : "issues"} match the current
                filters.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}
    </section>
  );
}

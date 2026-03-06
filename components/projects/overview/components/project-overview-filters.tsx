import { CalendarRange, Filter, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProjectPipelineSummary, ProjectTeamSummary } from "../types";

type ProjectOverviewFiltersProps = {
  teams: ProjectTeamSummary[];
  selectedTeamId: string;
  onTeamChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  selectedPipeline: ProjectPipelineSummary | null;
};

export function ProjectOverviewFilters({
  teams,
  selectedTeamId,
  onTeamChange,
  startDate,
  onStartDateChange,
  selectedPipeline,
}: ProjectOverviewFiltersProps) {
  return (
    <section className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="space-y-2">
        <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.08em]">
          Page Context
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 px-2.5 py-1 text-[11px] font-medium"
          >
            <Layers3 className="size-3.5" />
            {selectedPipeline ? selectedPipeline.name : "All pipelines"}
          </Badge>
          <span className="text-muted-foreground text-[12px] md:text-[13px]">
            {selectedPipeline
              ? selectedPipeline.description
              : "This page reflects the entire project unless you narrow it from the sidebar."}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:flex md:items-center">
        <Select value={selectedTeamId} onValueChange={onTeamChange}>
          <SelectTrigger
            className="w-full justify-between md:w-44"
            aria-label="Filter by team"
          >
            <Filter className="size-3.5" />
            <SelectValue placeholder="Filter by team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full md:w-48">
          <CalendarRange className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="pl-9"
            aria-label="Filter by start date"
          />
        </div>
      </div>
    </section>
  );
}

import { Button } from "@/components/ui/button";

import { ProjectDosView } from "../types";
import { getViewChipClass } from "../utils";

type ProjectDosViewSwitcherProps = {
  value: ProjectDosView;
  onValueChange: (value: ProjectDosView) => void;
};

const VIEW_OPTIONS: { value: ProjectDosView; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "table", label: "Table" },
  { value: "charts", label: "Timeline" },
];

export function ProjectDosViewSwitcher({
  value,
  onValueChange,
}: ProjectDosViewSwitcherProps) {
  return (
    <div className="bg-muted/80 inline-flex rounded-md p-0.5">
      {VIEW_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onValueChange(option.value)}
          className={getViewChipClass(value === option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

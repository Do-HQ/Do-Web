"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ProjectDosSectionTone = "sky" | "violet" | "cyan" | "rose" | "amber" | "emerald";

type ProjectDosSectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (label: string, tone: ProjectDosSectionTone) => void;
};

const TONES: Array<{
  value: ProjectDosSectionTone;
  label: string;
  swatchClassName: string;
}> = [
  { value: "sky", label: "Sky", swatchClassName: "bg-sky-500" },
  { value: "violet", label: "Violet", swatchClassName: "bg-violet-500" },
  { value: "cyan", label: "Cyan", swatchClassName: "bg-cyan-500" },
  { value: "rose", label: "Rose", swatchClassName: "bg-rose-500" },
  { value: "amber", label: "Amber", swatchClassName: "bg-amber-500" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-500" },
];

export function ProjectDosSectionDialog({
  open,
  onOpenChange,
  onCreate,
}: ProjectDosSectionDialogProps) {
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<ProjectDosSectionTone>("sky");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setLabel("");
      setTone("sky");
    }

    onOpenChange(nextOpen);
  };

  const handleCreate = () => {
    const nextLabel = label.trim();

    if (!nextLabel) {
      return;
    }

    onCreate(nextLabel, tone);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create board section</DialogTitle>
          <DialogDescription>
            Add a custom Kanban lane and choose a tone so it stands out from the status columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="kanban-section-name">Section name</Label>
            <Input
              id="kanban-section-name"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Needs feedback"
            />
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border/20 bg-background px-3 py-2 text-left text-[12px] transition-colors",
                    tone === option.value && "border-primary/25 bg-primary/5 ring-1 ring-primary/15",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", option.swatchClassName)} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!label.trim()}>
            Create section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

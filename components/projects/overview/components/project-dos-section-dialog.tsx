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

export type ProjectDosSectionTone =
  | "sky"
  | "violet"
  | "cyan"
  | "rose"
  | "amber"
  | "emerald"
  | "red"
  | "orange"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "purple"
  | "fuchsia"
  | "pink"
  | "slate";

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
  { value: "blue", label: "Blue", swatchClassName: "bg-blue-500" },
  { value: "indigo", label: "Indigo", swatchClassName: "bg-indigo-500" },
  { value: "violet", label: "Violet", swatchClassName: "bg-violet-500" },
  { value: "purple", label: "Purple", swatchClassName: "bg-purple-500" },
  { value: "fuchsia", label: "Fuchsia", swatchClassName: "bg-fuchsia-500" },
  { value: "pink", label: "Pink", swatchClassName: "bg-pink-500" },
  { value: "rose", label: "Rose", swatchClassName: "bg-rose-500" },
  { value: "red", label: "Red", swatchClassName: "bg-red-500" },
  { value: "orange", label: "Orange", swatchClassName: "bg-orange-500" },
  { value: "amber", label: "Amber", swatchClassName: "bg-amber-500" },
  { value: "yellow", label: "Yellow", swatchClassName: "bg-yellow-500" },
  { value: "lime", label: "Lime", swatchClassName: "bg-lime-500" },
  { value: "green", label: "Green", swatchClassName: "bg-green-500" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-500" },
  { value: "teal", label: "Teal", swatchClassName: "bg-teal-500" },
  { value: "cyan", label: "Cyan", swatchClassName: "bg-cyan-500" },
  { value: "slate", label: "Slate", swatchClassName: "bg-slate-500" },
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
            Add a custom Kanban lane and choose a tone so it stands out from the
            status columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="kanban-section-name">Section name</Label>
            <Input
              id="kanban-section-name"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Pre-prod"
            />
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border/20 bg-background px-3 py-2 text-left text-[12px] transition-colors",
                    tone === option.value &&
                      "border-primary/25 bg-primary/5 ring-1 ring-primary/15",
                  )}
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      option.swatchClassName,
                    )}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
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

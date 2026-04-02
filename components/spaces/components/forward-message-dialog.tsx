import { ArrowRight, Forward, MessagesSquare, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export type ForwardMessageTargetOption = {
  id: string;
  name: string;
  subtitle: string;
  kind: "person" | "group";
  avatarUrl?: string;
  avatarFallback?: string;
};

type ForwardMessageDialogProps = {
  open: boolean;
  search: string;
  sourcePreview: string;
  selectedTargetId: string;
  targetOptions: ForwardMessageTargetOption[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTarget: (targetId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const ForwardMessageDialog = ({
  open,
  search,
  sourcePreview,
  selectedTargetId,
  targetOptions,
  isSubmitting,
  onOpenChange,
  onSearchChange,
  onSelectTarget,
  onSubmit,
  onCancel,
}: ForwardMessageDialogProps) => {
  const hasSelection = Boolean(selectedTargetId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>
            Pick a person or chat group to forward this message to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Message
          </p>
          <div className="rounded-md border border-border/45 bg-muted/20 px-3 py-2 text-[12px]">
            <p className="line-clamp-2 break-words">{sourcePreview}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] font-medium">Send to</p>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search people or groups"
            className="h-9"
          />
        </div>

        <ScrollArea className="h-60 rounded-md border border-border/45 p-1.5">
          <div className="space-y-1">
            {targetOptions.length ? (
              targetOptions.map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => onSelectTarget(target.id)}
                    className="hover:bg-accent/60 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    <Avatar size="sm" className="size-8 shrink-0">
                      <AvatarImage src={target.avatarUrl || ""} alt={target.name} />
                      <AvatarFallback className="text-[10px]">
                        {target.avatarFallback || "SP"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{target.name}</p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {target.subtitle}
                      </p>
                    </div>
                    <Badge variant={target.kind === "person" ? "outline" : "secondary"}>
                      {target.kind === "person" ? (
                        <User className="size-3.5" />
                      ) : (
                        <MessagesSquare className="size-3.5" />
                      )}
                      {target.kind === "person" ? "Person" : "Group"}
                    </Badge>
                    {isSelected ? <ArrowRight className="size-4 text-primary" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="text-muted-foreground px-2 py-2 text-[12px]">
                No matching destinations.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!hasSelection || isSubmitting}
          >
            <Forward className="size-4" />
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;

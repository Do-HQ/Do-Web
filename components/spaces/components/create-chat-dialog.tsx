import { SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export type CreateChatMemberOption = {
  id: string;
  name: string;
  email: string;
};

type CreateChatDialogProps = {
  open: boolean;
  mode: "direct" | "group";
  groupName: string;
  search: string;
  selectedMemberIds: string[];
  memberOptions: CreateChatMemberOption[];
  canSubmit: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: "direct" | "group") => void;
  onGroupNameChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onToggleMember: (memberId: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const CreateChatDialog = ({
  open,
  mode,
  groupName,
  search,
  selectedMemberIds,
  memberOptions,
  canSubmit,
  isSubmitting,
  onOpenChange,
  onModeChange,
  onGroupNameChange,
  onSearchChange,
  onToggleMember,
  onCancel,
  onSubmit,
}: CreateChatDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Chat</DialogTitle>
          <DialogDescription>
            Create a direct message or a custom group chat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "direct" ? "default" : "outline"}
            className="h-8 px-3 text-[12px]"
            onClick={() => onModeChange("direct")}
          >
            Direct
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "group" ? "default" : "outline"}
            className="h-8 px-3 text-[12px]"
            onClick={() => onModeChange("group")}
          >
            Group
          </Button>
          <Badge variant="outline" className="ml-auto text-[11px]">
            {selectedMemberIds.length} selected
          </Badge>
        </div>

        {mode === "group" && (
          <div className="grid gap-1.5">
            <p className="text-[13px] font-medium">Group name</p>
            <Input
              value={groupName}
              onChange={(event) => onGroupNameChange(event.target.value)}
              placeholder="e.g. Launch war-room"
              className="h-9"
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <p className="text-[13px] font-medium">
            {mode === "direct" ? "Select one person" : "Select members"}
          </p>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search workspace members"
            className="h-9"
          />
        </div>

        <ScrollArea className="h-52 rounded-md border p-1.5">
          <div className="space-y-1">
            {memberOptions.length === 0 ? (
              <p className="text-muted-foreground px-2 py-2 text-[12px]">
                No matching workspace members.
              </p>
            ) : (
              memberOptions.map((member) => {
                const isChecked = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onToggleMember(member.id)}
                    className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                  >
                    <Checkbox checked={isChecked} className="size-4" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{member.name}</p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {member.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
            <SendHorizontal className="size-4" />
            {mode === "direct" ? "Start chat" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatDialog;

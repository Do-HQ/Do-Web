import { SendHorizontal } from "lucide-react";
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

type CreateChatDialogProps = {
  open: boolean;
  newChatPerson: string;
  canCreateChat: boolean;
  onOpenChange: (open: boolean) => void;
  onNewChatPersonChange: (value: string) => void;
  onCancel: () => void;
  onCreateChat: () => void;
};

const CreateChatDialog = ({
  open,
  newChatPerson,
  canCreateChat,
  onOpenChange,
  onNewChatPersonChange,
  onCancel,
  onCreateChat,
}: CreateChatDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Start Chat</DialogTitle>
          <DialogDescription>Who do you want to text?</DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <p className="text-[12px] font-medium">Person name</p>
          <Input
            value={newChatPerson}
            onChange={(event) => onNewChatPersonChange(event.target.value)}
            placeholder="e.g. Jude Okafor"
            className="h-9"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onCreateChat} disabled={!canCreateChat}>
            <SendHorizontal className="size-3.5" />
            Start chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatDialog;

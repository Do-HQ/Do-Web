import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WorkspaceDetailsDialogProps = {
  open: boolean;
  workspaceName: string;
  workspaceSlug: string;
  workspaceType: string;
  workspaceMembers: number;
  roomsCount: number;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onCopyUrl: () => void;
};

const WorkspaceDetailsDialog = ({
  open,
  workspaceName,
  workspaceSlug,
  workspaceType,
  workspaceMembers,
  roomsCount,
  onOpenChange,
  onClose,
  onCopyUrl,
}: WorkspaceDetailsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Workspace Details</DialogTitle>
          <DialogDescription>
            Overview of your current workspace and communication context.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          <div className="rounded-md border p-2.5">
            <p className="text-muted-foreground text-[11px]">Workspace</p>
            <p className="text-sm font-semibold">{workspaceName}</p>
            <p className="text-muted-foreground mt-0.5 text-[12px]">
              {workspaceSlug}.squircle.live
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border p-2.5">
              <p className="text-muted-foreground text-[11px]">Visibility</p>
              <p className="text-sm font-medium capitalize">{workspaceType}</p>
            </div>
            <div className="rounded-md border p-2.5">
              <p className="text-muted-foreground text-[11px]">Members</p>
              <p className="text-sm font-medium">{workspaceMembers}</p>
            </div>
          </div>

          <div className="rounded-md border p-2.5">
            <p className="text-muted-foreground text-[11px]">Spaces</p>
            <p className="text-sm font-medium">{roomsCount} active chats</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onCopyUrl}>
            <Copy className="size-4" />
            Copy URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceDetailsDialog;

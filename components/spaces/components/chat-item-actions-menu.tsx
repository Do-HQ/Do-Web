import {
  CheckCircle2,
  Copy,
  Ellipsis,
  MessageSquareReply,
  Pencil,
  Pin,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatItemActionsMenuProps = {
  isPinned: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onTogglePin: () => void;
  onForward: () => void;
  onDelete: () => void;
  onReplyInThread?: () => void;
  onCreateTask?: () => void;
  showCreateTask?: boolean;
};

const ChatItemActionsMenu = ({
  isPinned,
  onEdit,
  onCopy,
  onTogglePin,
  onForward,
  onDelete,
  onReplyInThread,
  onCreateTask,
  showCreateTask = false,
}: ChatItemActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-6 text-muted-foreground hover:text-foreground"
        >
          <Ellipsis className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {onReplyInThread && (
          <DropdownMenuItem className="text-[11px]" onClick={onReplyInThread}>
            <MessageSquareReply className="size-3.5" />
            Reply in thread
          </DropdownMenuItem>
        )}

        <DropdownMenuItem className="text-[11px]" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </DropdownMenuItem>

        <DropdownMenuItem className="text-[11px]" onClick={onCopy}>
          <Copy className="size-3.5" />
          Copy
        </DropdownMenuItem>

        <DropdownMenuItem className="text-[11px]" onClick={onTogglePin}>
          <Pin className="size-3.5" />
          {isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>

        <DropdownMenuItem className="text-[11px]" onClick={onForward}>
          <SendHorizontal className="size-3.5" />
          Forward
        </DropdownMenuItem>

        {showCreateTask && onCreateTask && (
          <DropdownMenuItem className="text-[11px]" onClick={onCreateTask}>
            <CheckCircle2 className="size-3.5" />
            Create as task
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="text-[11px]" onClick={onDelete}>
          <Trash2 className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChatItemActionsMenu;

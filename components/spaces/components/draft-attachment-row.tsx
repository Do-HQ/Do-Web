import { FileText, X } from "lucide-react";
import type { ChatAttachment } from "../types";

type DraftAttachmentRowProps = {
  attachments: ChatAttachment[];
  target: "main" | "thread";
  onRemoveAttachment: (attachmentId: string, target: "main" | "thread") => void;
};

const DraftAttachmentRow = ({
  attachments,
  target,
  onRemoveAttachment,
}: DraftAttachmentRowProps) => {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {attachments.map((attachment) => {
        if (attachment.kind === "image") {
          return (
            <div
              key={attachment.id}
              className="group relative h-14 w-14 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="bg-background/80 absolute top-1 right-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onRemoveAttachment(attachment.id, target)}
              >
                <X className="size-3" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={attachment.id}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px]"
          >
            <FileText className="size-3" />
            <span>{attachment.name}</span>
            <button
              type="button"
              onClick={() => onRemoveAttachment(attachment.id, target)}
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DraftAttachmentRow;

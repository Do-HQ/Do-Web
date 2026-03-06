import { FileText } from "lucide-react";
import type { ChatAttachment } from "../types";

type AttachmentPreviewProps = {
  attachments?: ChatAttachment[];
};

const AttachmentPreview = ({ attachments }: AttachmentPreviewProps) => {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className="mt-1.5 grid max-w-[28rem] grid-cols-2 gap-1.5">
      {attachments.map((attachment) => {
        if (attachment.kind === "image") {
          return (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="bg-background/80 text-muted-foreground absolute right-1 bottom-1 rounded-sm px-1 py-0.5 text-[11px]">
                image
              </div>
            </a>
          );
        }

        return (
          <div
            key={attachment.id}
            className="bg-secondary/70 text-secondary-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px]"
          >
            <FileText className="size-3.5" />
            <span className="truncate">{attachment.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export default AttachmentPreview;

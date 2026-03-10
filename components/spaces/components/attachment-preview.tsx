import { useState } from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ChatAttachment } from "../types";

type AttachmentPreviewProps = {
  attachments?: ChatAttachment[];
};

const AttachmentPreview = ({ attachments }: AttachmentPreviewProps) => {
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  if (!attachments?.length) {
    return null;
  }

  return (
    <>
      <div className="mt-1.5 grid max-w-[28rem] grid-cols-2 gap-1.5">
        {attachments.map((attachment) => {
          if (attachment.kind === "image" && attachment.url) {
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() =>
                  setPreviewImage({
                    url: attachment.url || "",
                    name: attachment.name,
                  })
                }
                className="group relative block overflow-hidden rounded-md border text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="bg-background/80 text-muted-foreground absolute right-1 bottom-1 rounded-sm px-1 py-0.5 text-[11px]">
                  preview
                </div>
              </button>
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

      <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
          <DialogTitle className="sr-only">
            {previewImage?.name || "Image preview"}
          </DialogTitle>
          <div className="bg-black/95 flex max-h-[85vh] items-center justify-center">
            {previewImage?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[85vh] w-full object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttachmentPreview;

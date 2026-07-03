"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { ChatAttachment } from "../types";
import VoiceNotePlayer from "./voice-note-player";

type AttachmentPreviewProps = {
  attachments?: ChatAttachment[];
};

const isAudioAttachment = (attachment: ChatAttachment) => {
  if (attachment.kind === "audio") return true;
  const value = `${attachment.name || ""} ${attachment.url || ""}`.toLowerCase();
  return /\.(webm|m4a|mp3|mpeg|ogg|oga|wav|aac)(\?|#|$)/i.test(value);
};

const imageAttachments = (attachments: ChatAttachment[]) =>
  attachments.filter((a) => a.kind === "image" && a.url);

function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: ChatAttachment[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIndex((i) => Math.min(images.length - 1, i + 1)),
    [images.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center justify-between px-5 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="max-w-[60%] truncate text-sm font-medium text-white/80">
          {current.name || "Image"}
          {images.length > 1 && (
            <span className="ml-2 text-white/40">
              {index + 1} / {images.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {current.url && (
            <a
              href={current.url}
              download={current.name || "image"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="size-4" />
            </a>
          )}
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev */}
        {hasPrev && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.url}
          src={current.url!}
          alt={current.name || "Image"}
          className="max-h-full max-w-full select-none rounded-md object-contain shadow-2xl"
          style={{ maxHeight: "calc(100vh - 140px)" }}
          draggable={false}
        />

        {/* Next */}
        {hasNext && (
          <button
            type="button"
            onClick={next}
            className="absolute right-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* Dot strip for multi-image */}
      {images.length > 1 && (
        <div
          className="flex shrink-0 justify-center gap-1.5 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`size-1.5 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

const AttachmentPreview = ({ attachments }: AttachmentPreviewProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!attachments?.length) return null;

  const images = imageAttachments(attachments);

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((attachment, i) => {
          if (isAudioAttachment(attachment) && attachment.url) {
            return (
              <VoiceNotePlayer
                key={attachment.id}
                url={attachment.url}
                name={attachment.name}
                compact
                fluid
                showName={false}
                className="w-full"
              />
            );
          }

          if (attachment.kind === "image" && attachment.url) {
            const imageIndex = images.findIndex((img) => img.id === attachment.id);
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => setLightboxIndex(imageIndex)}
                className="group relative block overflow-hidden rounded-lg border border-white/10 shadow-sm"
                style={{ width: images.length === 1 ? "min(100%, 320px)" : "min(calc(50% - 4px), 200px)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  style={{ aspectRatio: images.length === 1 ? "16 / 9" : "1 / 1" }}
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
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

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};

export default AttachmentPreview;

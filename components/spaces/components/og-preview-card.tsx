"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { getOgPreview } from "@/lib/services/og-service";

type OgPreviewCardProps = {
  url: string;
};

const OgPreviewCard = ({ url }: OgPreviewCardProps) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["og-preview", url],
    queryFn: () => getOgPreview(url),
    staleTime: 60 * 60 * 1000,
    retry: false,
    enabled: !!url,
  });

  if (isLoading || isError || !data) return null;

  const title = data.title || data.siteName || url;
  const hasImage = !!data.image;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex w-full max-w-sm overflow-hidden rounded-md border border-border/35 bg-accent/22 text-left transition-colors hover:bg-accent/35"
      onClick={(e) => e.stopPropagation()}
    >
      {hasImage && (
        <img
          src={data.image}
          alt={title}
          className="h-20 w-24 shrink-0 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="min-w-0 flex-1 p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <img
            src={data.favicon}
            alt=""
            className="size-3.5 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="truncate text-[10px] text-muted-foreground">
            {data.siteName || new URL(url).hostname}
          </span>
        </div>
        {title && (
          <p className="line-clamp-1 text-[12px] font-medium">{title}</p>
        )}
        {data.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default OgPreviewCard;

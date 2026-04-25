"use client";
import { DocEntry } from "@/types/toc";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

export default function DocCard({ doc }: { doc: DocEntry }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={doc.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col gap-5 border-b border-r border-border p-7 transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between">
        <span
          className="font-mono text-[11px] font-semibold tabular-nums tracking-widest transition-colors duration-200"
          style={{ color: hovered ? "var(--ring)" : "var(--muted-foreground)" }}
        >
          {String(doc.index).padStart(2, "0")}
        </span>

        {doc.tag && (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {doc.tag}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
            {doc.icon}
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {doc.title}
          </h3>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          {doc.subtitle}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {doc.description}
        </p>
      </div>

      <ArrowUpRight
        className="size-3.5 transition-all duration-200"
        style={{
          color: hovered ? "var(--ring)" : "var(--border)",
          transform: hovered ? "translate(2px, -2px)" : "translate(0,0)",
        }}
      />
    </a>
  );
}
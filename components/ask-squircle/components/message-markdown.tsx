import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReportMentionMeta } from "../types";

type MessageMarkdownProps = {
  content: string;
  className?: string;
  onOpenReport?: (reportId: string) => void;
  reportMetaById?: Record<string, ReportMentionMeta>;
};

const INLINE_TOKEN_REGEX =
  /(#\[[^\]]+\]\([a-f\d]{24}\)|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/gi;

const renderInline = (
  text: string,
  keyPrefix: string,
  onOpenReport?: (reportId: string) => void,
  reportMetaById?: Record<string, ReportMentionMeta>,
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  text.replace(INLINE_TOKEN_REGEX, (token, _full, _url, offset: number) => {
    if (offset > cursor) {
      nodes.push(text.slice(cursor, offset));
    }

    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${offset}`}
          className="bg-muted rounded px-1 py-0.5 font-mono text-[0.92em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("#[") && token.endsWith(")")) {
      const match = token.match(/^#\[([^\]]+)\]\(([a-f\d]{24})\)$/i);
      if (match) {
        const reportLabel = String(match[1] || "").trim();
        const reportId = String(match[2] || "").trim();
        const reportMeta = reportMetaById?.[reportId];
        const displayLabel =
          String(reportMeta?.title || "").trim() || reportLabel || "report";
        nodes.push(
          <Tooltip key={`${keyPrefix}-report-${offset}`} delayDuration={100}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors"
                onClick={() => onOpenReport?.(reportId)}
              >
                <FileText className="size-3 text-muted-foreground" />
                <span>#{displayLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              sideOffset={8}
              showArrow={false}
              className="max-w-80 rounded-lg border border-border/60 bg-popover px-3 py-2 text-popover-foreground shadow-lg"
            >
              <p className="text-xs font-semibold">{displayLabel}</p>
              {reportMeta?.subtitle ? (
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {reportMeta.subtitle}
                </p>
              ) : null}
            </TooltipContent>
          </Tooltip>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${offset}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-em-${offset}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const labelEnd = token.indexOf("](");
      const label = token.slice(1, labelEnd);
      const href = token.slice(labelEnd + 2, -1);
      nodes.push(
        <a
          key={`${keyPrefix}-link-${offset}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {label}
        </a>,
      );
    } else {
      nodes.push(token);
    }

    cursor = offset + token.length;
    return token;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

const isUnordered = (line: string) => /^[-*]\s+/.test(line);
const isOrdered = (line: string) => /^\d+\.\s+/.test(line);
const isHeading = (line: string) => /^#{1,6}\s+/.test(line);
const isQuote = (line: string) => /^>\s?/.test(line);

const MessageMarkdown = ({
  content,
  className,
  onOpenReport,
  reportMetaById,
}: MessageMarkdownProps) => {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.replace(/```+/, "").trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;

      blocks.push(
        <pre
          key={`code-${i}`}
          className="bg-muted overflow-x-auto rounded-md border border-border/60 p-3 text-[12px] leading-5"
        >
          {language ? (
            <div className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wide">
              {language}
            </div>
          ) : null}
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (isHeading(trimmed)) {
      const level = Math.min(6, Math.max(1, trimmed.match(/^#+/)?.[0]?.length || 1));
      const text = trimmed.replace(/^#{1,6}\s+/, "");
      const heading =
        level <= 2 ? (
            <h2 key={`heading-${i}`} className="text-base font-semibold tracking-tight">
            {renderInline(text, `heading-${i}`, onOpenReport, reportMetaById)}
          </h2>
        ) : (
          <h3 key={`heading-${i}`} className="text-sm font-semibold tracking-tight">
            {renderInline(text, `heading-${i}`, onOpenReport, reportMetaById)}
          </h3>
        );

      blocks.push(heading);
      i += 1;
      continue;
    }

    if (isQuote(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isQuote(lines[i].trim())) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }

      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="text-muted-foreground border-l-2 border-border pl-3 text-[13px]"
        >
          {quoteLines.map((quoteLine, index) => (
            <p key={`quote-line-${i}-${index}`}>
              {renderInline(
                quoteLine,
                `quote-${i}-${index}`,
                onOpenReport,
                reportMetaById,
              )}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (isUnordered(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && isUnordered(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={`ul-item-${i}-${index}`}>
              {renderInline(item, `ul-${i}-${index}`, onOpenReport, reportMetaById)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOrdered(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, index) => (
            <li key={`ol-item-${i}-${index}`}>
              {renderInline(item, `ol-${i}-${index}`, onOpenReport, reportMetaById)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current) {
        break;
      }
      if (
        current.startsWith("```") ||
        isHeading(current) ||
        isQuote(current) ||
        isUnordered(current) ||
        isOrdered(current)
      ) {
        break;
      }
      paragraphLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      <p key={`p-${i}`}>
        {paragraphLines.map((paragraphLine, index) => (
          <span key={`p-line-${i}-${index}`}>
            {renderInline(
              paragraphLine,
              `p-${i}-${index}`,
              onOpenReport,
              reportMetaById,
            )}
            {index < paragraphLines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>,
    );
  }

  return (
    <div className={cn("space-y-2 text-[13px] leading-6", className)}>{blocks}</div>
  );
};

export default MessageMarkdown;

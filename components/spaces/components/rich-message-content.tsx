import type React from "react";
import { cn } from "@/lib/utils";

type RichMessageContentProps = {
  content: string;
  className?: string;
  renderInlineContent?: (content: string) => React.ReactNode;
};

type MessageBlock =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "quote"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; content: string };

const parseMessageBlocks = (value = ""): MessageBlock[] => {
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] || "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeStart = trimmed.match(/^```([\w-]*)\s*$/);
    if (codeStart) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^```\s*$/.test(lines[index]?.trim() || "")) {
        codeLines.push(lines[index] || "");
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({
        type: "code",
        language: codeStart[1] || "",
        content: codeLines.join("\n"),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: heading[2],
      });
      index += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s+/.test((lines[index] || "").trim())) {
        quoteLines.push((lines[index] || "").trim().replace(/^>\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", content: quoteLines.join("\n") });
      continue;
    }

    const unordered = /^[-*]\s+/.test(trimmed);
    const ordered = /^\d+\.\s+/.test(trimmed);
    if (unordered || ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = (lines[index] || "").trim();
        const matches = ordered ? /^\d+\.\s+/.test(current) : /^[-*]\s+/.test(current);
        if (!matches) {
          break;
        }
        items.push(current.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] || "";
      const currentTrimmed = current.trim();
      if (
        !currentTrimmed ||
        /^```/.test(currentTrimmed) ||
        /^(#{1,3})\s+/.test(currentTrimmed) ||
        /^>\s+/.test(currentTrimmed) ||
        /^[-*]\s+/.test(currentTrimmed) ||
        /^\d+\.\s+/.test(currentTrimmed)
      ) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }

    blocks.push({ type: "paragraph", content: paragraphLines.join("\n") });
  }

  return blocks;
};

const renderInline = (
  value: string,
  renderInlineContent?: (content: string) => React.ReactNode,
) => renderInlineContent ? renderInlineContent(value) : value;

export default function RichMessageContent({
  content,
  className,
  renderInlineContent,
}: RichMessageContentProps) {
  const blocks = parseMessageBlocks(content);

  if (!blocks.length) {
    return null;
  }

  return (
    <div className={cn("space-y-2 text-[12.5px] leading-5", className)}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={`code-${index}`}
              className="max-w-full overflow-x-auto rounded-md border bg-muted/55 px-2.5 py-2 text-[12px] leading-5 text-foreground"
            >
              {block.language ? (
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {block.language}
                </span>
              ) : null}
              <code>{block.content}</code>
            </pre>
          );
        }

        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return (
            <Tag
              key={`heading-${index}`}
              className={cn(
                "font-semibold tracking-tight text-foreground",
                block.level === 1 ? "text-[15px]" : "text-[13.5px]",
              )}
            >
              {renderInline(block.content, renderInlineContent)}
            </Tag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`quote-${index}`}
              className="border-l-2 border-border pl-2 text-muted-foreground"
            >
              {renderInline(block.content, renderInlineContent)}
            </blockquote>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={`list-${index}`}
              className={cn(
                "space-y-1 pl-4",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>
                  {renderInline(item, renderInlineContent)}
                </li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="whitespace-pre-wrap">
            {renderInline(block.content, renderInlineContent)}
          </p>
        );
      })}
    </div>
  );
}

"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Code2,
  Heading1,
  List,
  ListOrdered,
  Paperclip,
  Pilcrow,
  Quote,
  SendHorizontal,
  Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MentionSuggestionRow } from "@/components/shared/mention-suggestion-row";
import { cn } from "@/lib/utils";
import type { ChatAttachment, MentionSuggestion } from "../types";
import DraftAttachmentRow from "./draft-attachment-row";
import VoiceNoteRecorder from "./voice-note-recorder";

type ComposerTarget = "main" | "thread";
type MentionSymbol = "@" | "#";

type RichMessageComposerProps = {
  value: string;
  attachments: ChatAttachment[];
  uploadRef: React.RefObject<HTMLInputElement | null>;
  target: ComposerTarget;
  canSend: boolean;
  placeholder: string;
  sendLabel: string;
  hint?: string;
  className?: string;
  compact?: boolean;
  mentionSuggestions: MentionSuggestion[];
  reportMentionSuggestions: MentionSuggestion[];
  onChange: (value: string) => void;
  onSend: () => void;
  onUploadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAttachFiles: (files: File[], target: ComposerTarget) => void;
  onRemoveAttachment: (attachmentId: string, target: ComposerTarget) => void;
};

type ComposerFormat =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "quote"
  | "bullet"
  | "numbered"
  | "code";

type ActiveMention = {
  symbol: MentionSymbol;
  search: string;
};

const formatOptions: Array<{
  label: string;
  description: string;
  value: ComposerFormat;
  icon: React.ElementType;
}> = [
  {
    label: "Paragraph",
    description: "Normal message text",
    value: "paragraph",
    icon: Pilcrow,
  },
  {
    label: "Heading 1",
    description: "Large section title",
    value: "heading-1",
    icon: Heading1,
  },
  {
    label: "Heading 2",
    description: "Medium section title",
    value: "heading-2",
    icon: Type,
  },
  {
    label: "Heading 3",
    description: "Small section title",
    value: "heading-3",
    icon: Type,
  },
  {
    label: "Quote",
    description: "Call out context",
    value: "quote",
    icon: Quote,
  },
  {
    label: "Bulleted list",
    description: "Turn lines into bullets",
    value: "bullet",
    icon: List,
  },
  {
    label: "Numbered list",
    description: "Turn lines into ordered steps",
    value: "numbered",
    icon: ListOrdered,
  },
  {
    label: "Code block",
    description: "Paste logs or snippets",
    value: "code",
    icon: Code2,
  },
];

const mentionTokenPattern = /([@#])([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;

const mentionChipClass =
  "mx-0.5 inline-flex items-center rounded-md bg-orange-500/12 px-1 py-0.5 text-orange-300";

const stripMentionPrefix = (value: string) =>
  String(value || "")
    .replace(/^(team|project|report)\s*:/i, "")
    .trim();

const createMentionElement = (
  symbol: MentionSymbol,
  suggestion: Pick<MentionSuggestion, "id" | "display" | "kind">,
) => {
  const span = document.createElement("span");
  const token = String(suggestion.id || "").trim().toLowerCase();
  const display = String(suggestion.display || token).trim();

  span.dataset.mentionToken = token;
  span.dataset.mentionSymbol = symbol;
  span.dataset.mentionLabel = display;
  span.dataset.mentionKind = suggestion.kind || "";
  span.contentEditable = "false";
  span.className = mentionChipClass;
  span.textContent = `${symbol}${stripMentionPrefix(display) || token}`;

  return span;
};

const appendInlineContent = (
  container: HTMLElement,
  text: string,
  suggestionByToken: Map<string, MentionSuggestion>,
) => {
  const normalizedText = String(text || "");
  let lastIndex = 0;
  let match: RegExpExecArray | null = mentionTokenPattern.exec(normalizedText);

  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    const symbol = String(match[1] || "@") as MentionSymbol;
    const token = String(match[2] || "").toLowerCase();
    const suggestion = suggestionByToken.get(token);

    if (start > lastIndex) {
      container.appendChild(
        document.createTextNode(normalizedText.slice(lastIndex, start)),
      );
    }

    if (suggestion) {
      container.appendChild(createMentionElement(symbol, suggestion));
    } else {
      container.appendChild(document.createTextNode(match[0]));
    }

    lastIndex = end;
    match = mentionTokenPattern.exec(normalizedText);
  }

  if (lastIndex < normalizedText.length) {
    container.appendChild(document.createTextNode(normalizedText.slice(lastIndex)));
  }
};

const appendBlock = (
  root: HTMLElement,
  tagName: keyof HTMLElementTagNameMap,
  content: string,
  suggestionByToken: Map<string, MentionSuggestion>,
) => {
  const block = document.createElement(tagName);
  appendInlineContent(block, content, suggestionByToken);
  root.appendChild(block);
};

const loadMarkdownIntoEditor = (
  root: HTMLElement,
  value: string,
  suggestionByToken: Map<string, MentionSuggestion>,
) => {
  root.replaceChildren();

  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
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

      const pre = document.createElement("pre");
      pre.textContent = codeLines.join("\n");
      root.appendChild(pre);
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const tagName =
        heading[1].length === 1 ? "h1" : heading[1].length === 2 ? "h2" : "h3";
      appendBlock(
        root,
        tagName,
        heading[2] || "",
        suggestionByToken,
      );
      index += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quote = document.createElement("blockquote");
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s+/.test((lines[index] || "").trim())) {
        quoteLines.push((lines[index] || "").trim().replace(/^>\s+/, ""));
        index += 1;
      }
      appendInlineContent(quote, quoteLines.join("\n"), suggestionByToken);
      root.appendChild(quote);
      continue;
    }

    const unordered = /^[-*]\s+/.test(trimmed);
    const ordered = /^\d+\.\s+/.test(trimmed);
    if (unordered || ordered) {
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length) {
        const current = (lines[index] || "").trim();
        const matches = ordered ? /^\d+\.\s+/.test(current) : /^[-*]\s+/.test(current);
        if (!matches) {
          break;
        }

        const item = document.createElement("li");
        appendInlineContent(
          item,
          current.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""),
          suggestionByToken,
        );
        list.appendChild(item);
        index += 1;
      }
      root.appendChild(list);
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

    appendBlock(root, "p", paragraphLines.join("\n"), suggestionByToken);
  }
};

const getSerializedText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(getSerializedText).join("");
  }

  const mentionToken = node.dataset.mentionToken;
  if (mentionToken) {
    const symbol = (node.dataset.mentionSymbol || "@") as MentionSymbol;
    return `${symbol}${mentionToken}`;
  }

  if (node.tagName === "BR") {
    return "\n";
  }

  return Array.from(node.childNodes).map(getSerializedText).join("");
};

const serializeBlock = (node: Node, index: number) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return getSerializedText(node).trimEnd();
  }

  if (!(node instanceof HTMLElement)) {
    return getSerializedText(node).trimEnd();
  }

  const text = getSerializedText(node).trimEnd();
  const tagName = node.tagName.toLowerCase();

  if (!text && tagName !== "br") {
    return "";
  }

  if (tagName === "h1") {
    return `# ${text}`;
  }

  if (tagName === "h2") {
    return `## ${text}`;
  }

  if (tagName === "h3") {
    return `### ${text}`;
  }

  if (tagName === "blockquote") {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (tagName === "pre") {
    return `\`\`\`text\n${text}\n\`\`\``;
  }

  if (tagName === "ul" || tagName === "ol") {
    return Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, itemIndex) => {
        const itemText = getSerializedText(child).trimEnd();
        return tagName === "ol" ? `${itemIndex + 1}. ${itemText}` : `- ${itemText}`;
      })
      .join("\n");
  }

  if (tagName === "li") {
    return `${index + 1}. ${text}`;
  }

  return text;
};

const serializeEditor = (root: HTMLElement | null) => {
  if (!root) {
    return "";
  }

  return Array.from(root.childNodes)
    .map(serializeBlock)
    .filter((block) => block.trim().length > 0)
    .join("\n\n")
    .trim();
};

const getCaretText = (root: HTMLElement | null) => {
  if (!root || typeof window === "undefined") {
    return "";
  }

  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) {
    return "";
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(root);
  range.setEnd(selection.anchorNode, selection.anchorOffset);

  return range.toString();
};

export default function RichMessageComposer({
  value,
  attachments,
  uploadRef,
  target,
  canSend,
  placeholder,
  sendLabel,
  hint,
  className,
  compact = false,
  mentionSuggestions,
  reportMentionSuggestions,
  onChange,
  onSend,
  onUploadFromInput,
  onAttachFiles,
  onRemoveAttachment,
}: RichMessageComposerProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastSerializedValueRef = useRef("");
  const [hasSelection, setHasSelection] = useState(false);
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const allSuggestions = useMemo(
    () => [...mentionSuggestions, ...reportMentionSuggestions],
    [mentionSuggestions, reportMentionSuggestions],
  );
  const suggestionByToken = useMemo(() => {
    const next = new Map<string, MentionSuggestion>();
    allSuggestions.forEach((suggestion) => {
      const id = String(suggestion.id || "").trim().toLowerCase();
      if (id) {
        next.set(id, suggestion);
      }
    });
    return next;
  }, [allSuggestions]);

  const filteredMentionSuggestions = useMemo(() => {
    if (!activeMention) {
      return [];
    }

    const source =
      activeMention.symbol === "#"
        ? reportMentionSuggestions
        : mentionSuggestions.filter((entry) => entry.kind !== "report");
    const search = activeMention.search.toLowerCase();

    return source
      .filter((entry) => {
        if (!search) {
          return true;
        }

        return `${entry.display || ""} ${entry.subtitle || ""}`
          .toLowerCase()
          .includes(search);
      })
      .slice(0, 8);
  }, [activeMention, mentionSuggestions, reportMentionSuggestions]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastSerializedValueRef.current) {
      return;
    }

    loadMarkdownIntoEditor(editor, value, suggestionByToken);
    lastSerializedValueRef.current = value;
  }, [suggestionByToken, value]);

  const syncValueFromEditor = () => {
    const serialized = serializeEditor(editorRef.current);
    lastSerializedValueRef.current = serialized;
    onChange(serialized);
    updateMentionState();
  };

  const updateSelectionState = () => {
    const selection = typeof window === "undefined" ? null : window.getSelection();
    setHasSelection(
      Boolean(
        selection?.rangeCount &&
          !selection.isCollapsed &&
          editorRef.current?.contains(selection.anchorNode),
      ),
    );
  };

  const updateMentionState = () => {
    const caretText = getCaretText(editorRef.current);
    const match = caretText.match(/(^|\s)([@#])([^\s@#]*)$/);

    if (!match) {
      setActiveMention(null);
      return;
    }

    setActiveMention({
      symbol: match[2] as MentionSymbol,
      search: match[3] || "",
    });
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const applyFormat = (format: ComposerFormat) => {
    focusEditor();

    if (!editorRef.current?.textContent?.trim()) {
      const starter =
        format === "quote"
          ? "Quote"
          : format === "bullet" || format === "numbered"
            ? "List item"
            : format === "code"
              ? ""
              : format.startsWith("heading")
                ? "Heading"
                : "";
      if (starter) {
        document.execCommand("insertText", false, starter);
      }
    }

    if (format === "paragraph") {
      document.execCommand("formatBlock", false, "p");
    } else if (format === "heading-1") {
      document.execCommand("formatBlock", false, "h1");
    } else if (format === "heading-2") {
      document.execCommand("formatBlock", false, "h2");
    } else if (format === "heading-3") {
      document.execCommand("formatBlock", false, "h3");
    } else if (format === "quote") {
      document.execCommand("formatBlock", false, "blockquote");
    } else if (format === "bullet") {
      document.execCommand("insertUnorderedList", false);
    } else if (format === "numbered") {
      document.execCommand("insertOrderedList", false);
    } else if (format === "code") {
      document.execCommand("formatBlock", false, "pre");
    }

    syncValueFromEditor();
    updateSelectionState();
  };

  const insertMention = (suggestion: MentionSuggestion) => {
    const editor = editorRef.current;
    const selection = typeof window === "undefined" ? null : window.getSelection();
    const symbol = activeMention?.symbol || (suggestion.kind === "report" ? "#" : "@");

    if (!editor || !selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer;
      const text = textNode.textContent || "";
      const beforeCaret = text.slice(0, range.startOffset);
      const match = beforeCaret.match(/(^|\s)([@#])([^\s@#]*)$/);

      if (match) {
        const startOffset = range.startOffset - (match[2] + (match[3] || "")).length;
        range.setStart(textNode, Math.max(0, startOffset));
      }
    }

    range.deleteContents();
    const mention = createMentionElement(symbol, suggestion);
    const trailingSpace = document.createTextNode(" ");
    range.insertNode(trailingSpace);
    range.insertNode(mention);

    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.setStartAfter(trailingSpace);
    nextRange.collapse(true);
    selection.addRange(nextRange);

    setActiveMention(null);
    syncValueFromEditor();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (activeMention && filteredMentionSuggestions.length > 0) {
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(filteredMentionSuggestions[0]);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setActiveMention(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncValueFromEditor();
  };

  const isEmpty = !value.trim();

  return (
    <div
      className={cn(
        "bg-background/88 border-border/35 focus-within:border-ring focus-within:ring-ring/45 relative flex flex-col rounded-none border border-x-0 border-b-0 backdrop-blur-sm transition-[border-color,box-shadow] focus-within:ring-2 sm:rounded-md sm:border",
        className,
      )}
    >
      <div className="relative px-2 pt-2">
        {isEmpty ? (
          <button
            type="button"
            className="text-muted-foreground pointer-events-none absolute top-4 left-5 text-left text-[13px]"
            tabIndex={-1}
          >
            {placeholder}
          </button>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={placeholder}
          aria-multiline="true"
          className={cn(
            "rich-space-composer min-h-18 max-h-56 overflow-y-auto rounded-md px-2 py-2 text-[13px] leading-5 outline-none",
            "prose-blocks [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground",
            "[&_h1]:mb-1 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h1]:tracking-tight",
            "[&_h2]:mb-1 [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:tracking-tight",
            "[&_h3]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold",
            "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
            "[&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/55 [&_pre]:px-2.5 [&_pre]:py-2 [&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:leading-5",
            compact && "min-h-14 max-h-40",
          )}
          onInput={syncValueFromEditor}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            updateSelectionState();
            updateMentionState();
          }}
          onMouseUp={updateSelectionState}
          onPaste={handlePaste}
        />

        {activeMention && filteredMentionSuggestions.length > 0 ? (
          <div className="absolute right-3 bottom-2 left-3 z-30 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
            {filteredMentionSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="w-full rounded-md text-left"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(suggestion);
                }}
              >
                <MentionSuggestionRow
                  label={String(suggestion.display || "")}
                  kind={suggestion.kind}
                  avatarUrl={suggestion.avatarUrl}
                  avatarFallback={suggestion.avatarFallback}
                  subtitle={suggestion.subtitle}
                />
              </button>
            ))}
          </div>
        ) : null}

        <DraftAttachmentRow
          attachments={attachments}
          target={target}
          onRemoveAttachment={onRemoveAttachment}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-border/35 px-1.5 py-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 px-2 text-[12px]",
                hasSelection && "bg-accent text-accent-foreground",
              )}
            >
              <Type className="size-3.5" />
              Format
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-64 rounded-lg p-1.5"
          >
            <div className="px-2 py-1.5">
              <p className="text-[12px] font-medium">Text style</p>
              <p className="text-muted-foreground text-[10.5px]">
                Select text, then choose a block style.
              </p>
            </div>
            <div className="grid gap-0.5">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyFormat(option.value)}
                  >
                    <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50">
                      <Icon className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium leading-tight">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground block truncate text-[10.5px] leading-tight">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-[12px]"
          onClick={() => uploadRef.current?.click()}
        >
          <Paperclip className="size-3.5" />
          Attach
        </Button>
        <input
          ref={uploadRef}
          type="file"
          multiple
          className="hidden"
          onChange={onUploadFromInput}
        />

        <VoiceNoteRecorder
          onRecordingReady={(file) => onAttachFiles([file], target)}
        />

        {hint ? (
          <p className="text-muted-foreground ml-1 hidden text-[11px] md:block">
            {hint}
          </p>
        ) : null}

        <Button
          type="button"
          size="sm"
          className="ml-auto h-8 px-2.5 text-[12px]"
          disabled={!canSend}
          onClick={onSend}
        >
          <SendHorizontal className="size-3.5" />
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}

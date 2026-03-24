"use client";

import { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface WorkspaceDocEditorProps {
  docId: string;
  initialContent: unknown[];
  editable: boolean;
  onContentChange: (content: unknown[]) => void;
  className?: string;
  immersive?: boolean;
}

const normalizeInitialContent = (content: unknown[]): PartialBlock[] => {
  if (!Array.isArray(content) || !content.length) {
    return [
      {
        type: "paragraph",
        content: "",
      },
    ];
  }

  return content as PartialBlock[];
};

const WorkspaceDocEditor = ({
  docId,
  initialContent,
  editable,
  onContentChange,
  className,
  immersive = false,
}: WorkspaceDocEditorProps) => {
  const { resolvedTheme } = useTheme();
  const normalizedContent = normalizeInitialContent(initialContent);

  const editor = useCreateBlockNote(
    {
      initialContent: normalizedContent,
    },
    [docId],
  );

  return (
    <div
      key={docId}
      className={cn(
        "workspace-doc-editor min-h-[22rem]",
        immersive
          ? "bg-transparent"
          : "bg-card/55 ring-border/35 rounded-md ring-1",
        className,
      )}
    >
      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={() => onContentChange(editor.document)}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        className={cn(
          "workspace-doc-editor-view",
          immersive && "rounded-none border-none bg-transparent p-0",
        )}
      />
    </div>
  );
};

export default WorkspaceDocEditor;

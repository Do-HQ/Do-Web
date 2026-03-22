"use client";

import { useMemo } from "react";
import { BookText, Link2 } from "lucide-react";
import Link from "next/link";

import useWorkspaceDoc from "@/hooks/use-workspace-doc";
import WorkspaceDocEditor from "@/components/docs/workspace-doc-editor";
import LoaderComponent from "@/components/shared/loader";
import Logo from "@/components/shared/logo";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface SharedDocViewProps {
  shareToken: string;
}

const SharedDocView = ({ shareToken }: SharedDocViewProps) => {
  const workspaceDocHook = useWorkspaceDoc();
  const sharedDocQuery = workspaceDocHook.useSharedWorkspaceDoc(shareToken, {
    enabled: Boolean(shareToken),
  });

  const doc = sharedDocQuery.data?.data?.doc || null;
  const editedLabel = useMemo(() => {
    const value = doc?.lastEditedAt || doc?.updatedAt;
    if (!value) {
      return "—";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString();
  }, [doc?.lastEditedAt, doc?.updatedAt]);

  if (sharedDocQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <LoaderComponent />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Empty className="max-w-md gap-3 p-4">
          <EmptyHeader className="gap-2">
            <EmptyMedia variant="icon" className="size-10">
              <Link2 className="size-4.5 text-primary/85" />
            </EmptyMedia>
            <EmptyTitle className="text-[13px]">
              Shared document not found
            </EmptyTitle>
            <EmptyDescription className="text-[12px]">
              This link may be invalid, expired, or no longer shared publicly.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <main className="bg-background min-h-svh">
      <div className="border-b border-border/45">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-3 px-3 py-2.5 md:px-5">
          <Logo isFull />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[64rem] p-3 md:p-5">
        <header className="mb-3 border-b border-border/50 pb-3">
          <h1 className="text-[19px] font-semibold tracking-tight">
            {doc.title || "Untitled doc"}
          </h1>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Last edited {editedLabel}
          </p>
        </header>

        <WorkspaceDocEditor
          docId={doc.id}
          initialContent={doc.content || []}
          editable={false}
          onContentChange={() => {}}
          immersive
        />
      </div>
    </main>
  );
};

export default SharedDocView;

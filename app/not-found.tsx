import Link from "next/link";
import { FileQuestion, FolderKanban, Home } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ROUTES } from "@/utils/constants";

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <Empty className="border-border/40 bg-card/70 max-w-xl border p-8 shadow-xs md:p-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion className="size-5 text-primary" />
          </EmptyMedia>
          <EmptyTitle className="text-[18px]">Page not found</EmptyTitle>
          <EmptyDescription className="text-[13px]">
            This page may have moved, been archived, or the link may be
            incomplete.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="flex-row justify-center gap-2">
          <Link
            href={ROUTES.DASHBOARD}
            className={buttonVariants({ size: "sm" })}
          >
            <Home className="size-4" />
            Go home
          </Link>
          <Link
            href={ROUTES.PROJECTS}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <FolderKanban className="size-4" />
            View projects
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

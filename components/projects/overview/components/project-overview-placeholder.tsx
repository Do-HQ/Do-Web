import LoaderComponent from "@/components/shared/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { FolderSearch, Sparkles } from "lucide-react";

type ProjectOverviewPlaceholderProps = {
  kind: "missing" | "coming-soon" | "loading";
  label?: string;
};

export function ProjectOverviewPlaceholder({
  kind,
  label,
}: ProjectOverviewPlaceholderProps) {
  const title =
    kind === "missing"
      ? "Project not found"
      : `${label ?? "This section"} is coming next`;
  const description =
    kind === "missing"
      ? "The route is valid, but there is no project record mapped to this id yet."
      : "The overview shell is in place and this tab is the next implementation pass.";

  if (kind === "loading") {
    return <LoaderComponent />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13px]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Empty className="border-0 p-0 md:p-0">
          <EmptyHeader className="items-start text-left">
            <EmptyMedia variant="icon">
              {kind === "missing" ? (
                <FolderSearch className="size-4 text-amber-400" />
              ) : (
                <Sparkles className="size-4 text-primary" />
              )}
            </EmptyMedia>
            <EmptyDescription className="text-[12px] leading-5">
              {description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}

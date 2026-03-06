import ProjectOverview from "@/components/projects/overview";

type SearchParams = {
  pipeline?: string | string[];
  tab?: string | string[];
  workflow?: string | string[];
};

type ProjectOverviewPageProps = {
  params: Promise<{ projectId: string }> | { projectId: string };
  searchParams?: Promise<SearchParams> | SearchParams;
};

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: ProjectOverviewPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pipelineValue = resolvedSearchParams?.pipeline;
  const pipelineId = Array.isArray(pipelineValue)
    ? pipelineValue[0]
    : pipelineValue;
  const tabValue = resolvedSearchParams?.tab;
  const initialTab = Array.isArray(tabValue) ? tabValue[0] : tabValue;
  const normalizedTab =
    initialTab === "overview" ||
    initialTab === "workflows" ||
    initialTab === "dos" ||
    initialTab === "files-assets" ||
    initialTab === "risks-issues" ||
    initialTab === "secrets" ||
    initialTab === "agents-automation"
      ? initialTab
      : undefined;
  const workflowValue = resolvedSearchParams?.workflow;
  const workflowId = Array.isArray(workflowValue) ? workflowValue[0] : workflowValue;

  return (
    <ProjectOverview
      key={`${resolvedParams.projectId}:${pipelineId ?? "base"}:${normalizedTab ?? "overview"}:${workflowId ?? "none"}`}
      projectId={resolvedParams.projectId}
      pipelineId={pipelineId}
      initialTab={normalizedTab}
    />
  );
}

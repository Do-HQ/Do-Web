import WorkspaceDocs from "@/components/docs/workspace-docs";

type WorkspaceDocDetailPageProps = {
  params: Promise<{ docId: string }> | { docId: string };
};

export default async function WorkspaceDocDetailPage({
  params,
}: WorkspaceDocDetailPageProps) {
  const resolvedParams = await params;
  const docId = decodeURIComponent(String(resolvedParams.docId || ""));

  return <WorkspaceDocs activeDocId={docId} />;
}


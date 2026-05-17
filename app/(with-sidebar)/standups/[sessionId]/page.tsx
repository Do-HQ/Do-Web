import WorkspaceStandupDetailPage from "@/components/standup/workspace-standup-detail-page";

type StandupDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

const StandupDetailPage = async ({ params }: StandupDetailPageProps) => {
  const resolved = await params;
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-y-auto">
      <WorkspaceStandupDetailPage sessionId={decodeURIComponent(resolved.sessionId || "")} />
    </div>
  );
};

export default StandupDetailPage;

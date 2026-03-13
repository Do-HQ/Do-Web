import JamsPage from "@/components/jams";

const WorkspaceJamCanvasPage = async ({
  params,
}: {
  params: Promise<{ jamId: string }>;
}) => {
  const { jamId } = await params;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <JamsPage key={jamId} routeJamId={jamId} />
    </div>
  );
};

export default WorkspaceJamCanvasPage;

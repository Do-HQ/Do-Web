import WorkspaceReportDetailPage from "@/components/reports/workspace-report-detail-page";

type ReportDetailPageProps = {
  params: Promise<{ reportId: string }>;
};

const ReportDetailPage = async ({ params }: ReportDetailPageProps) => {
  const resolved = await params;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-y-auto">
      <WorkspaceReportDetailPage reportId={decodeURIComponent(resolved.reportId || "")} />
    </div>
  );
};

export default ReportDetailPage;

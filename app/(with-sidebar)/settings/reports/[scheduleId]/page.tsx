import WorkspaceReportScheduleEditor from "@/components/reports/workspace-report-schedule-editor";

type EditReportSchedulePageProps = {
  params: Promise<{ scheduleId: string }>;
};

const EditReportSchedulePage = async ({ params }: EditReportSchedulePageProps) => {
  const resolved = await params;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-y-auto">
      <WorkspaceReportScheduleEditor
        scheduleId={decodeURIComponent(resolved.scheduleId || "")}
      />
    </div>
  );
};

export default EditReportSchedulePage;

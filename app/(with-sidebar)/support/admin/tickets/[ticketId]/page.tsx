import WorkspaceSupportTicketThread from "@/components/support/workspace-support-ticket-thread";

type SupportAdminTicketThreadPageProps = {
  params: Promise<{ ticketId: string }> | { ticketId: string };
};

export default async function SupportAdminTicketThreadPage({
  params,
}: SupportAdminTicketThreadPageProps) {
  const resolvedParams = await params;
  return (
    <WorkspaceSupportTicketThread
      ticketId={resolvedParams.ticketId}
      internalOnly
    />
  );
}

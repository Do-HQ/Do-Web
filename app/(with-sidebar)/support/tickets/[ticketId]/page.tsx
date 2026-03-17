import WorkspaceSupportTicketThread from "@/components/support/workspace-support-ticket-thread";

type SupportTicketThreadPageProps = {
  params: Promise<{ ticketId: string }> | { ticketId: string };
};

export default async function SupportTicketThreadPage({
  params,
}: SupportTicketThreadPageProps) {
  const resolvedParams = await params;
  return <WorkspaceSupportTicketThread ticketId={resolvedParams.ticketId} />;
}

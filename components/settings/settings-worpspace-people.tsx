import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../ui/field";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";
import SettingsWorkspacePropleInvitesTable from "./settings-workspace-people-invite-table";
import SettingsWorkspacePropleRequestsTable from "./settings-workspace-people-requests.table";
import SettingsWorkspacePeopleTable from "./settings-workspace-prople-table";

const SettingsWorkspacePeople = () => {
  const { isAdminLike } = useWorkspacePermissions();

  return (
    <div>
      <FieldGroup className="flex flex-col gap-8">
        <FieldSet>
          <FieldLegend>Workspace People</FieldLegend>
          <FieldDescription>
            Manage workspace members, team placement, roles, and account access.
          </FieldDescription>
          <SettingsWorkspacePeopleTable />
        </FieldSet>

        {isAdminLike ? <FieldSeparator /> : null}

        {isAdminLike ? (
          <FieldSet>
            <FieldLegend>Workspace Join Requests</FieldLegend>
            <FieldDescription>
              Review pending requests from users who want to join this workspace.
            </FieldDescription>
            <SettingsWorkspacePropleRequestsTable />
          </FieldSet>
        ) : null}

        {isAdminLike ? <FieldSeparator /> : null}

        {isAdminLike ? (
          <FieldSet>
            <FieldLegend>Workspace Invites</FieldLegend>
            <FieldDescription>
              Send, resend, and revoke workspace invitations.
            </FieldDescription>
            <SettingsWorkspacePropleInvitesTable />
          </FieldSet>
        ) : null}
      </FieldGroup>
    </div>
  );
};

export default SettingsWorkspacePeople;

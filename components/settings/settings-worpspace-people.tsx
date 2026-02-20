import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../ui/field";
import SettingsWorkspacePropleInvitesTable from "./settings-workspace-people-invite-table";
import SettingsWorkspacePropleRequestsTable from "./settings-workspace-people-requests.table";
import SettingsWorkspacePeopleTable from "./settings-workspace-prople-table";

const SettingsWorkspacePeople = () => {
  return (
    <div>
      <FieldGroup className="flex flex-col gap-8">
        <FieldSet>
          <FieldLegend>Workspace People</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <SettingsWorkspacePeopleTable />
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Workspace Join Requests</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <SettingsWorkspacePropleRequestsTable />
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>Workspace Invites</FieldLegend>
          <FieldDescription>
            These details identify your workspace and are visible to members.
          </FieldDescription>
          <SettingsWorkspacePropleInvitesTable />
        </FieldSet>
      </FieldGroup>
    </div>
  );
};

export default SettingsWorkspacePeople;
